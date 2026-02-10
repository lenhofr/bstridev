# Terraform: GitHub Actions OIDC role

Creates:
- `token.actions.githubusercontent.com` OIDC provider (if not already present)
- IAM role assumable by GitHub Actions for this repo/branch **and pull_request workflows**
- Least-privilege policy for `aws s3 sync` + CloudFront invalidation

## Bootstrap apply (from your laptop)
This creates the OIDC provider + a **Terraform apply role** for GitHub Actions.

```bash
cd infra/terraform/github-actions-oidc
terraform init \
  -backend-config="bucket=tf-state-common-217354297026-us-east-1" \
  -backend-config="key=bstri/infra/terraform/github-actions-oidc.tfstate" \
  -backend-config="region=us-east-1"

terraform apply \
  -var github_owner=lenhofr \
  -var github_repo=bstri \
  -var github_branch=main
```

## Later (after static-site exists)
Re-apply with `create_deploy_role=true` to create the deploy role used by the site deploy workflow:

```bash
terraform apply \
  -var github_owner=lenhofr \
  -var github_repo=bstri \
  -var github_branch=main \
  -var create_deploy_role=true \
  -var s3_bucket_name=<bucket_name> \
  -var cloudfront_distribution_id=<cloudfront_distribution_id>
```

## Outputs
- `terraform_role_arn` → set as GitHub secret `AWS_TERRAFORM_ROLE_ARN`
- `role_arn` (optional; only when create_deploy_role=true) → set as GitHub secret `AWS_ROLE_ARN`
