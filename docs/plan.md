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
  - Trust policy updated to allow BOTH repos during cutover:
    - `repo:lenhofr/azure-bst-ui:*`
    - `repo:lenhofr/bstridev:*`
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
- [x] Confirm what we are migrating for barsportsdev.com:
  - Terraform stacks: `infra/terraform/app` and `infra/terraform/github-actions-oidc`
  - CI workflows: Terraform apply/plan + deploy
  - Web app: `web/` Next.js static export
- [x] Confirm target GitHub repo + default branch: `lenhofr/bstridev` on `main`.

### 2) Build the minimal repo structure in bstridev
- [x] Copy only the required directories/files from `bstdevdotcom` → `bstridev`:
  - [x] `web/` (source only; excluded `node_modules/`, `.next/`, `out/`)
  - [x] `infra/terraform/app/`
  - [x] `infra/terraform/github-actions-oidc/`
  - [x] `.github/workflows/{terraform.yml,terraform-plan.yml,deploy.yml}`
  - [x] Add `.gitignore` suitable for Next.js + Terraform
- [x] Fix the deploy workflow trigger filter (removed `docs/deploy.md` path filter).

### 3) Update Terraform to support “allowed repos” during cutover
- [x] Update both Terraform stacks to allow a list of GitHub repositories in the OIDC trust policy.
  - Defaults include `lenhofr/azure-bst-ui` and `lenhofr/bstridev`.

### 4) Apply Terraform changes safely (no resource replacement)
- [x] Run `terraform init/plan/apply` for both stacks against the existing backends.
- [x] Verified/apply resulted in **in-place IAM trust updates only** (0 destroys).

### 5) Configure GitHub Actions in bstridev
- [x] Add GitHub repo secret in **lenhofr/bstridev**:
  - [x] `AWS_TERRAFORM_ROLE_ARN`
- [ ] After merge, confirm workflows run successfully from `bstridev`:
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
