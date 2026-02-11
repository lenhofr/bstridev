locals {
  oauth_callback_urls = distinct(compact(concat(
    var.admin_oauth_callback_urls,
    [
      "https://${aws_cloudfront_distribution.cdn.domain_name}/admin/scoring",
      var.custom_domain_name != null ? "https://${var.custom_domain_name}/admin/scoring" : null,
      var.custom_domain_name != null ? "https://www.${var.custom_domain_name}/admin/scoring" : null
    ],
    [for d in var.alternate_domain_names : "https://${d}/admin/scoring"]
  )))

  oauth_logout_urls = distinct(compact(concat(
    var.admin_oauth_logout_urls,
    [
      "https://${aws_cloudfront_distribution.cdn.domain_name}/admin/scoring",
      var.custom_domain_name != null ? "https://${var.custom_domain_name}/admin/scoring" : null,
      var.custom_domain_name != null ? "https://www.${var.custom_domain_name}/admin/scoring" : null
    ],
    [for d in var.alternate_domain_names : "https://${d}/admin/scoring"]
  )))
}

resource "random_id" "cognito_domain_suffix" {
  byte_length = 4

  keepers = {
    project = var.project_name
  }
}

resource "aws_cognito_user_pool" "admin" {
  name = "${var.project_name}-admin"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 10
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }

  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  tags = merge(var.tags, { project = var.project_name })
}

resource "aws_cognito_user_pool_client" "admin" {
  name         = "${var.project_name}-admin-web"
  user_pool_id = aws_cognito_user_pool.admin.id

  generate_secret = false

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]

  supported_identity_providers = ["COGNITO"]

  callback_urls = local.oauth_callback_urls
  logout_urls   = local.oauth_logout_urls

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]
}

resource "aws_cognito_user_pool_domain" "admin" {
  domain       = "${replace(lower(var.project_name), "/[^a-z0-9-]/", "-")}-${random_id.cognito_domain_suffix.hex}"
  user_pool_id = aws_cognito_user_pool.admin.id
}

resource "aws_dynamodb_table" "scoring_docs" {
  name         = "${var.project_name}-scoring-docs"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "eventId"
  range_key = "kind"

  attribute {
    name = "eventId"
    type = "S"
  }

  attribute {
    name = "kind"
    type = "S"
  }

  tags = merge(var.tags, { project = var.project_name })
}

data "archive_file" "scoring_lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/../../lambda/scoring/index.js"
  output_path = "${path.module}/.terraform/scoring-lambda.zip"
}

resource "aws_iam_role" "scoring_lambda" {
  name = "${var.project_name}-scoring-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(var.tags, { project = var.project_name })
}

data "aws_iam_policy_document" "scoring_lambda" {
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }

  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem"
    ]
    resources = [aws_dynamodb_table.scoring_docs.arn]
  }
}

resource "aws_iam_policy" "scoring_lambda" {
  name   = "${var.project_name}-scoring-lambda"
  policy = data.aws_iam_policy_document.scoring_lambda.json
  tags   = merge(var.tags, { project = var.project_name })
}

resource "aws_iam_role_policy_attachment" "scoring_lambda" {
  role       = aws_iam_role.scoring_lambda.name
  policy_arn = aws_iam_policy.scoring_lambda.arn
}

resource "aws_lambda_function" "scoring" {
  function_name = "${var.project_name}-scoring"
  role          = aws_iam_role.scoring_lambda.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"

  filename         = data.archive_file.scoring_lambda_zip.output_path
  source_code_hash = data.archive_file.scoring_lambda_zip.output_base64sha256

  environment {
    variables = {
      SCORING_TABLE_NAME = aws_dynamodb_table.scoring_docs.name
    }
  }

  tags = merge(var.tags, { project = var.project_name })
}

resource "aws_apigatewayv2_api" "scoring" {
  name          = "${var.project_name}-scoring"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["authorization", "content-type"]
    allow_methods = ["GET", "PUT", "POST", "OPTIONS"]
    allow_origins = ["*"]
  }

  tags = merge(var.tags, { project = var.project_name })
}

resource "aws_apigatewayv2_authorizer" "scoring" {
  api_id          = aws_apigatewayv2_api.scoring.id
  authorizer_type = "JWT"
  name            = "cognito-jwt"

  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.admin.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.admin.id}"
  }
}

resource "aws_apigatewayv2_integration" "scoring" {
  api_id                 = aws_apigatewayv2_api.scoring.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.scoring.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "published_get" {
  api_id    = aws_apigatewayv2_api.scoring.id
  route_key = "GET /events/{eventId}/scoring/published"
  target    = "integrations/${aws_apigatewayv2_integration.scoring.id}"
}

resource "aws_apigatewayv2_route" "draft_get" {
  api_id             = aws_apigatewayv2_api.scoring.id
  route_key          = "GET /events/{eventId}/scoring/draft"
  target             = "integrations/${aws_apigatewayv2_integration.scoring.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.scoring.id
}

resource "aws_apigatewayv2_route" "draft_put" {
  api_id             = aws_apigatewayv2_api.scoring.id
  route_key          = "PUT /events/{eventId}/scoring/draft"
  target             = "integrations/${aws_apigatewayv2_integration.scoring.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.scoring.id
}

resource "aws_apigatewayv2_route" "publish_post" {
  api_id             = aws_apigatewayv2_api.scoring.id
  route_key          = "POST /events/{eventId}/publish"
  target             = "integrations/${aws_apigatewayv2_integration.scoring.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.scoring.id
}

resource "aws_apigatewayv2_stage" "scoring" {
  api_id      = aws_apigatewayv2_api.scoring.id
  name        = "$default"
  auto_deploy = true

  tags = merge(var.tags, { project = var.project_name })
}

resource "aws_lambda_permission" "apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scoring.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.scoring.execution_arn}/*/*"
}
