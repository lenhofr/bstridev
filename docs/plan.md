# Plan: Move barsportsdev.com to new repo (lenhofr/bstridev)

## Goal
Make **/Users/robl/dev/static/bstridev** the single source of truth for **barsportsdev.com** (code + Terraform + CI/CD), **without destroying/recreating** any AWS resources.

## Current state (confirmed)
- AWS account: **217354297026**
- **barsportsdev.com**
  - CloudFront distribution: **E2EW74R4PEG3E2** (`dwxhom2tw1qkl.cloudfront.net`)
  - Origin: **S3 bucket `bstri-site-0db96edf`**
  - Terraform state: `s3://tf-state-common-217354297026-us-east-1/bstri/terraform.tfstate`
  - Managed resources include: S3 bucket + policy, OAC, CloudFront distro + function, ACM cert, Route53 alias records, IAM deploy role.
- GitHub Actions OIDC IAM roles (existing):
  - **bstri-github-actions-terraform** (used by Terraform workflows)
  - **bstri-github-actions-deploy** (used by deploy workflow)
  - Both currently trust **repo:lenhofr/azure-bst-ui:\*** (NOT bstridev yet).
- Separate Terraform state for the Terraform-apply role:
  - `s3://tf-state-common-217354297026-us-east-1/bstri/infra/terraform/github-actions-oidc.tfstate`
- New repo **bstridev** currently contains only a README (empty otherwise).

## Constraints / preferences
- ✅ Keep existing AWS resources and DNS (no `terraform destroy`).
- ✅ Keep existing Terraform state bucket/key (per your choice).
- ✅ Transition period where BOTH repos can assume the roles (per your choice), then remove old repo.

---

## Workplan

### 1) Inventory and “source-of-truth” decisions
- [ ] Confirm what we are migrating for barsportsdev.com:
  - Terraform stacks: `infra/terraform/app` and `infra/terraform/github-actions-oidc`
  - CI workflows: Terraform apply/plan + deploy
  - Web app: `web/` Next.js static export
  - Exclude legacy/unused folders (e.g., root `terraform/`, root static HTML files) unless you explicitly want them.
- [ ] Confirm target GitHub repo + default branch: `lenhofr/bstridev` on `main`.

### 2) Build the minimal repo structure in bstridev
- [ ] Copy only the required directories/files from `bstdevdotcom` → `bstridev`:
  - [ ] `web/` (source only; exclude `node_modules/`, `.next/`, `out/`)
  - [ ] `infra/terraform/app/`
  - [ ] `infra/terraform/github-actions-oidc/`
  - [ ] `.github/workflows/{terraform.yml,terraform-plan.yml,deploy.yml}`
  - [ ] Add/adjust `.gitignore` suitable for Next.js + Terraform
- [ ] Fix the deploy workflow trigger filter:
  - `deploy.yml` references `docs/deploy.md` but there is no `docs/` folder; either remove that path filter or add the doc (prefer remove to keep minimal).

### 3) Update Terraform to support “allowed repos” during cutover
We need Terraform-managed IAM trust policies to allow both:
- `lenhofr/azure-bst-ui` (old)
- `lenhofr/bstridev` (new)

Implementation approach (minimal + reversible):
- [ ] In **infra/terraform/app**:
  - [ ] Change from single `github_repository` string → list variable (e.g., `github_repositories = ["lenhofr/azure-bst-ui", "lenhofr/bstridev"]`).
  - [ ] Update the IAM role assume-role policy to use `StringLike: { "token.actions.githubusercontent.com:sub": ["repo:<old>:*", "repo:<new>:*"] }`.
  - [ ] Keep the same backend config (`bstri/terraform.tfstate`).
- [ ] In **infra/terraform/github-actions-oidc**:
  - [ ] Similarly update trust policy construction to accept a list of repos (or accept `github_repositories` directly).
  - [ ] Keep the same backend key (`bstri/infra/terraform/github-actions-oidc.tfstate`) via backend-config.

### 4) Apply Terraform changes safely (no resource replacement)
- [ ] From your laptop (AWS-authenticated), run `terraform init` + `terraform plan` for both stacks using the existing backend locations.
- [ ] Verify plans show **in-place IAM trust policy updates only** (no deletes/recreates of CloudFront/S3/Route53).
- [ ] `terraform apply` both stacks to update IAM trust so bstridev Actions can assume roles.

### 5) Configure GitHub Actions in bstridev
- [ ] Add GitHub repo secrets in **lenhofr/bstridev**:
  - [ ] `AWS_TERRAFORM_ROLE_ARN` = arn of **bstri-github-actions-terraform**
- [ ] Verify workflows match the moved folder structure:
  - Terraform apply uses `infra/terraform/app`.
  - Deploy workflow reads Terraform outputs then assumes deploy role from output.
- [ ] Make a small test commit to `bstridev` to confirm:
  - [ ] `Terraform (apply)` succeeds.
  - [ ] `Deploy (static site)` succeeds (S3 sync + CloudFront invalidation).

### 6) Cut over fully to bstridev
- [ ] Disable/retire pipelines in the old repo (`azure-bst-ui`):
  - [ ] Turn off Actions workflows or add a guard to prevent deploy/apply.
- [ ] Remove old repo from IAM trust policies (Terraform apply) once bstridev has been stable:
  - [ ] Update allowed repos list to only `["lenhofr/bstridev"]`.
  - [ ] Apply both Terraform stacks.

### 7) Validation checklist
- [ ] `curl -I https://barsportsdev.com` shows CloudFront and expected caching/redirect behavior.
- [ ] Confirm CloudFront distribution **E2EW74R4PEG3E2** origin remains **bstri-site-0db96edf**.
- [ ] Confirm recent S3 object timestamps update after deploy.
- [ ] Confirm CloudFront invalidation created after deploy.

---

## Notes / risks
- The GitHub Actions OIDC trust policy is the critical dependency: until it includes `lenhofr/bstridev`, Actions in the new repo cannot assume AWS roles.
- We will NOT rename AWS resources (bucket/distro/roles). Renames in Terraform generally imply replacement; we’ll keep names as-is.
- There are multiple historical Terraform state files under the `bstri/` prefix; we will continue using the two active ones:
  - `bstri/terraform.tfstate` (static site + deploy role)
  - `bstri/infra/terraform/github-actions-oidc.tfstate` (terraform apply role)

## Rollback
- Re-enable workflows in the old repo.
- Keep IAM trust allowing both repos (or revert to old-only) until the issue is resolved.
