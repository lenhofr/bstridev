variable "project_name" {
  type        = string
  description = "Prefix used for naming the AWS resources"
  default     = "bstri"
}

variable "site_bucket_name" {
  type        = string
  description = "If set, use/import an existing site bucket name instead of creating a new one."
  default     = null
}

variable "aws_region" {
  type        = string
  description = "Region for regional resources (S3, etc.)"
  default     = "us-east-1"
}

variable "github_repositories" {
  type        = list(string)
  description = "GitHub repositories (owner/repo) allowed to assume the GitHub Actions OIDC role."
  default     = ["lenhofr/azure-bst-ui", "lenhofr/bstridev"]
}

variable "github_repository" {
  type        = string
  description = "(Legacy) Single GitHub repository (owner/repo) used when github_repositories is empty."
  default     = "lenhofr/azure-bst-ui"
}

variable "existing_oidc_provider_arn" {
  type        = string
  description = "Reuse an existing GitHub Actions OIDC provider instead of creating one (accepts ARN or host like token.actions.githubusercontent.com)."
  default     = "token.actions.githubusercontent.com"
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "custom_domain_name" {
  type        = string
  description = "Optional custom domain apex (e.g. barsportsdev.com). Leave null to use the CloudFront domain."
  default     = null
}

variable "alternate_domain_names" {
  type        = list(string)
  description = "Optional additional domain names (e.g. [\"www.barsportsdev.com\"]). Only used when custom_domain_name is set."
  default     = []
}

variable "redirect_www_to_apex" {
  type        = bool
  description = "When true, redirect www.<custom_domain_name> to the apex via CloudFront Function."
  default     = false
}

variable "route53_zone_id" {
  type        = string
  description = "Optional Route53 hosted zone ID used for ACM DNS validation + alias records."
  default     = null
}

variable "create_route53_record" {
  type        = bool
  description = "When true, create Route53 alias records for custom_domain_name (and alternates) in route53_zone_id."
  default     = false
}
