# bstridev (barsportsdev.com)

Source of truth for **barsportsdev.com**:
- Next.js site (static export) in `web/`
- AWS infrastructure in `infra/terraform/app`
- GitHub Actions CI/CD in `.github/workflows`

## Architecture (high level)
- Route53 → CloudFront → S3
- The deploy pipeline builds a static export (`web/out`), syncs it to S3, then invalidates CloudFront.

## Deployments
### Automatic deploys (recommended)
GitHub Actions deploys on every push to `main` that touches:
- `web/**`
- `.github/workflows/deploy.yml`

Two workflows are involved:
- **Terraform (apply)**: `.github/workflows/terraform.yml`
  - Applies `infra/terraform/app` using OIDC (no long-lived AWS keys)
  - Requires GitHub secret: `AWS_TERRAFORM_ROLE_ARN`
- **Deploy (static site)**: `.github/workflows/deploy.yml`
  - Runs `npm install` + `npm run build` in `web/`
  - Reads Terraform outputs from `infra/terraform/app`:
    - `bucket_name`
    - `cloudfront_distribution_id`
    - `github_actions_role_arn` (deploy role)
  - Syncs `web/out` to the S3 bucket and creates a CloudFront invalidation

### Environments / state
This repo is currently wired to the existing **barsportsdev.com** stack.
- AWS region: `us-east-1`
- Site bucket: `bstri-site-0db96edf`
- CloudFront distribution: `E2EW74R4PEG3E2`
- Terraform state backend: `s3://tf-state-common-217354297026-us-east-1/bstri/terraform.tfstate`

Live values are defined in `infra/terraform/app/terraform.tfvars`.

## Local development
```bash
cd web
npm install
npm run dev
```

## Local build (matches CI)
```bash
cd web
npm install
npm run build
```

## Terraform
```bash
cd infra/terraform/app
terraform init
terraform plan
terraform apply
```

## Notes for maintainers
- This stack uses GitHub Actions OIDC roles; keep trust policies up to date when changing repos/orgs.
- Avoid renaming AWS resources in Terraform unless you intend replacements.
