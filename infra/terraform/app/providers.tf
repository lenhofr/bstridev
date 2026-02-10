provider "aws" {
  region = var.aws_region
}

# CloudFront requires ACM certs in us-east-1.
provider "aws" {
  alias  = "use1"
  region = "us-east-1"
}

data "aws_caller_identity" "current" {}
