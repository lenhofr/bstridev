data "aws_caller_identity" "current" {}

data "tls_certificate" "github_actions" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  tags = merge(var.tags, { project = var.project })

  # Allow all workflows in these repos (push, PR, workflow_run, workflow_dispatch, etc.).
  repo_subs = length(var.github_repositories) > 0 ? [for r in var.github_repositories : "repo:${r}:*"] : ["repo:${var.github_owner}/${var.github_repo}:*"]

  bucket_arn = var.s3_bucket_name == null ? null : "arn:aws:s3:::${var.s3_bucket_name}"
  dist_arn   = var.cloudfront_distribution_id == null ? null : "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${var.cloudfront_distribution_id}"
}

resource "aws_iam_openid_connect_provider" "github" {
  count           = var.existing_oidc_provider_arn == null ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github_actions.certificates[0].sha1_fingerprint]
  tags            = local.tags
}

locals {
  oidc_provider_arn = var.existing_oidc_provider_arn != null ? (
    startswith(var.existing_oidc_provider_arn, "arn:") ? var.existing_oidc_provider_arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${var.existing_oidc_provider_arn}"
  ) : aws_iam_openid_connect_provider.github[0].arn

  # For AssumeRoleWithWebIdentity, the federated principal must reference the OIDC provider.
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "sts:AssumeRoleWithWebIdentity"
        Principal = {
          Federated = local.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = local.repo_subs
          }
        }
      }
    ]
  })
}

resource "aws_iam_role" "deploy" {
  count              = var.create_deploy_role ? 1 : 0
  name               = "${var.project}-github-actions-deploy"
  assume_role_policy = local.assume_role_policy
  tags               = local.tags
}

data "aws_iam_policy_document" "deploy" {
  count = var.create_deploy_role ? 1 : 0

  statement {
    sid = "S3List"
    actions = [
      "s3:GetBucketLocation",
      "s3:ListBucket",
      "s3:ListBucketMultipartUploads"
    ]
    resources = [local.bucket_arn]
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
    resources = ["${local.bucket_arn}/*"]
  }

  statement {
    sid = "CloudFrontInvalidation"
    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetDistribution",
      "cloudfront:GetInvalidation",
      "cloudfront:ListInvalidations"
    ]
    resources = [local.dist_arn]
  }
}

resource "aws_iam_policy" "deploy" {
  count  = var.create_deploy_role ? 1 : 0
  name   = "${var.project}-github-actions-deploy"
  policy = data.aws_iam_policy_document.deploy[0].json
  tags   = local.tags
}

resource "aws_iam_role_policy_attachment" "deploy" {
  count      = var.create_deploy_role ? 1 : 0
  role       = aws_iam_role.deploy[0].name
  policy_arn = aws_iam_policy.deploy[0].arn
}

resource "aws_iam_role" "terraform" {
  count              = var.create_terraform_role ? 1 : 0
  name               = "${var.project}-github-actions-terraform"
  assume_role_policy = local.assume_role_policy
  tags               = local.tags
}

# Enforce required vars when creating deploy role
resource "terraform_data" "validate" {
  input = true

  lifecycle {
    precondition {
      condition     = !var.create_deploy_role || (var.s3_bucket_name != null && var.cloudfront_distribution_id != null)
      error_message = "When create_deploy_role=true you must set s3_bucket_name and cloudfront_distribution_id."
    }
  }
}

resource "aws_iam_role_policy_attachment" "terraform" {
  count      = var.create_terraform_role ? 1 : 0
  role       = aws_iam_role.terraform[0].name
  policy_arn = var.terraform_role_policy_arn
}
