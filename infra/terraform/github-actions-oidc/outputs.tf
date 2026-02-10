output "role_arn" {
  value = var.create_deploy_role ? aws_iam_role.deploy[0].arn : null
}

output "terraform_role_arn" {
  value = var.create_terraform_role ? aws_iam_role.terraform[0].arn : null
}

output "oidc_provider_arn" {
  value = local.oidc_provider_arn
}
