output "bucket_name" {
  value = aws_s3_bucket.site.bucket
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.cdn.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.cdn.id
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC (set this as GitHub secret AWS_ROLE_ARN)"
  value       = aws_iam_role.github_actions_deploy.arn
}

output "scoring_api_base_url" {
  value = aws_apigatewayv2_api.scoring.api_endpoint
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.admin.id
}

output "cognito_user_pool_client_id" {
  value = aws_cognito_user_pool_client.admin.id
}

output "cognito_hosted_ui_domain" {
  value = "https://${aws_cognito_user_pool_domain.admin.domain}.auth.${var.aws_region}.amazoncognito.com"
}
