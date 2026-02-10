data "tls_certificate" "github_actions" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  name = var.project_name
  tags = merge(var.tags, { project = var.project_name })

  oidc_provider_arn = startswith(var.existing_oidc_provider_arn, "arn:") ? var.existing_oidc_provider_arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${var.existing_oidc_provider_arn}"

  github_repo_subs = length(var.github_repositories) > 0 ? [for r in var.github_repositories : "repo:${r}:*"] : ["repo:${var.github_repository}:*"]
}

resource "random_id" "bucket_suffix" {
  count       = var.site_bucket_name == null ? 1 : 0
  byte_length = 4

  keepers = {
    project = var.project_name
    region  = var.aws_region
  }
}

locals {
  site_bucket_name = var.site_bucket_name != null ? var.site_bucket_name : lower("${local.name}-site-${random_id.bucket_suffix[0].hex}")
}

resource "aws_s3_bucket" "site" {
  bucket        = local.site_bucket_name
  force_destroy = false
  tags          = local.tags
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${local.name}-oac"
  description                       = "OAC for S3 origin"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_iam_policy_document" "site_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.cdn.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site_policy.json
}

resource "aws_cloudfront_function" "rewrite_directory_index" {
  name    = "${local.name}-rewrite-directory-index"
  runtime = "cloudfront-js-1.0"
  comment = "Rewrite /foo and /foo/ to /foo.html for Next.js static export"
  publish = true

  code = <<JS
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  var redirectWwwToApex = ${var.redirect_www_to_apex};
  var apexHost = "${var.custom_domain_name != null ? var.custom_domain_name : ""}";

  // Optional www -> apex redirect (staging/prod preference).
  if (redirectWwwToApex && request.headers && request.headers.host && request.headers.host.value) {
    var host = request.headers.host.value;
    if (apexHost && host === ("www." + apexHost)) {
      return {
        statusCode: 301,
        statusDescription: "Moved Permanently",
        headers: {
          location: { value: "https://" + apexHost + request.uri }
        }
      };
    }
  }

  // Let default_root_object handle "/" and don't rewrite Next.js assets.
  if (uri === "/" || uri.startsWith("/_next/")) {
    return request;
  }

  // Normalize trailing slash.
  if (uri.endsWith("/")) {
    uri = uri.slice(0, -1);
  }

  // If there is no file extension, assume it's a route and map to .html.
  if (uri.indexOf(".") === -1) {
    request.uri = uri + ".html";
  }

  return request;
}
JS
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    # Keep this stable across regions and match common CloudFront console defaults.
    domain_name              = "${aws_s3_bucket.site.bucket}.s3.${var.aws_region}.amazonaws.com"
    origin_id                = "s3-site"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-site"

    viewer_protocol_policy = "redirect-to-https"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite_directory_index.arn
    }

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.custom_domain_name == null
    acm_certificate_arn            = var.custom_domain_name == null ? null : aws_acm_certificate_validation.cert[0].certificate_arn
    ssl_support_method             = var.custom_domain_name == null ? null : "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  aliases = var.custom_domain_name == null ? [] : concat([var.custom_domain_name], var.alternate_domain_names)

  tags = local.tags
}

resource "aws_acm_certificate" "cert" {
  count                     = var.custom_domain_name == null ? 0 : 1
  provider                  = aws.use1
  domain_name               = var.custom_domain_name
  subject_alternative_names = var.alternate_domain_names
  validation_method         = "DNS"
  tags                      = local.tags

  lifecycle {
    precondition {
      condition     = var.custom_domain_name == null || var.route53_zone_id != null
      error_message = "route53_zone_id must be set when using custom_domain_name (needed for ACM DNS validation)."
    }
  }
}

locals {
  cert_domains = var.custom_domain_name == null ? [] : concat([var.custom_domain_name], var.alternate_domain_names)

  # domain_validation_options is a set, so index-free lookup by domain name.
  cert_validation_by_domain = var.custom_domain_name == null ? {} : {
    for dvo in aws_acm_certificate.cert[0].domain_validation_options : dvo.domain_name => dvo
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = toset(local.cert_domains)

  zone_id         = var.route53_zone_id
  allow_overwrite = true

  name    = local.cert_validation_by_domain[each.key].resource_record_name
  type    = local.cert_validation_by_domain[each.key].resource_record_type
  records = [local.cert_validation_by_domain[each.key].resource_record_value]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "cert" {
  count           = var.custom_domain_name == null ? 0 : 1
  provider        = aws.use1
  certificate_arn = aws_acm_certificate.cert[0].arn

  validation_record_fqdns = [for r in values(aws_route53_record.cert_validation) : r.fqdn]
}

resource "aws_route53_record" "alias_a" {
  count           = var.custom_domain_name != null && var.create_route53_record ? 1 : 0
  zone_id         = var.route53_zone_id
  allow_overwrite = true
  name            = var.custom_domain_name
  type            = "A"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "alias_aaaa" {
  count           = var.custom_domain_name != null && var.create_route53_record ? 1 : 0
  zone_id         = var.route53_zone_id
  allow_overwrite = true
  name            = var.custom_domain_name
  type            = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "alias_a_alternates" {
  for_each = var.custom_domain_name != null && var.create_route53_record ? toset(var.alternate_domain_names) : toset([])

  zone_id         = var.route53_zone_id
  allow_overwrite = true
  name            = each.value
  type            = "A"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "alias_aaaa_alternates" {
  for_each = var.custom_domain_name != null && var.create_route53_record ? toset(var.alternate_domain_names) : toset([])

  zone_id         = var.route53_zone_id
  allow_overwrite = true
  name            = each.value
  type            = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

# GitHub Actions role for deploys (aws-actions/configure-aws-credentials).
resource "aws_iam_role" "github_actions_deploy" {
  name = "${local.name}-github-actions-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = local.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = local.github_repo_subs
          }
        }
      }
    ]
  })

  tags = local.tags
}

data "aws_iam_policy_document" "github_actions_deploy" {
  statement {
    sid = "S3List"
    actions = [
      "s3:GetBucketLocation",
      "s3:ListBucket",
      "s3:ListBucketMultipartUploads"
    ]
    resources = [aws_s3_bucket.site.arn]
  }

  statement {
    sid = "S3ObjectRW"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:AbortMultipartUpload",
      "s3:ListMultipartUploadParts"
    ]
    resources = ["${aws_s3_bucket.site.arn}/*"]
  }

  statement {
    sid = "CloudFrontInvalidation"
    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetDistribution",
      "cloudfront:GetInvalidation",
      "cloudfront:ListInvalidations"
    ]
    resources = [aws_cloudfront_distribution.cdn.arn]
  }
}

resource "aws_iam_policy" "github_actions_deploy" {
  name   = "${local.name}-github-actions-deploy"
  policy = data.aws_iam_policy_document.github_actions_deploy.json
  tags   = local.tags
}

resource "aws_iam_role_policy_attachment" "github_actions_deploy" {
  role       = aws_iam_role.github_actions_deploy.name
  policy_arn = aws_iam_policy.github_actions_deploy.arn
}
