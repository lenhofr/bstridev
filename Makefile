.PHONY: help web-install web-dev web-build web-test web-clean tf-init tf-plan tf-apply tf-output

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

web-install: ## Install web dependencies
	@cd web && npm install

web-dev: ## Run Next.js dev server (PORT=3005)
	@cd web && npm run dev -- --port $${PORT:-3005}

web-build: ## Build static export (matches CI)
	@cd web && npm install --no-audit --no-fund && npm run build

web-test: ## Run web unit tests
	@cd web && npm test

web-clean: ## Remove Next.js build artifacts
	@rm -rf web/.next web/out

tf-init: ## Terraform init (infra/terraform/app)
	@cd infra/terraform/app && terraform init

tf-plan: ## Terraform plan (infra/terraform/app)
	@cd infra/terraform/app && terraform init && terraform plan

tf-apply: ## Terraform apply (infra/terraform/app)
	@cd infra/terraform/app && terraform init && terraform apply

tf-output: ## Terraform output (infra/terraform/app)
	@cd infra/terraform/app && terraform init && terraform output
