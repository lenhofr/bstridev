## 1. Spec + design alignment
- [ ] 1.1 Confirm scoring model: raw scores vs points vs both; confirm entities (team vs individual).
- [ ] 1.2 Confirm admin access model (fixed admins in Cognito vs invite flow).

## 2. Infrastructure (Terraform)
- [ ] 2.1 Add Cognito User Pool + app client + hosted UI domain.
- [ ] 2.2 Add API Gateway + Lambda(s) + JWT authorizer.
- [ ] 2.3 Add DynamoDB tables for Events and Scores (draft + published).
- [ ] 2.4 Output API base URL + Cognito config (user pool id, client id, hosted UI URL) from Terraform.

## 3. Backend implementation
- [ ] 3.1 Implement API endpoints for event metadata + scoring CRUD.
- [ ] 3.2 Implement publish workflow (draft → published).
- [ ] 3.3 Add input validation and clear error responses.

## 4. Web app (Next.js)
- [ ] 4.1 Add `/admin/scoring` route (client component) with login flow.
- [ ] 4.2 Admin UI: select event (default current year), edit scores for bowling/pool/darts (3 games each).
- [ ] 4.3 Compute derived totals/points and show a preview.
- [ ] 4.4 Publish action that promotes draft to published.

## 5. Public consumption
- [ ] 5.1 Add read-only data fetch for published results (new/updated results page).
- [ ] 5.2 Provide fallback behavior if no published data exists.

## 6. Validation
- [ ] 6.1 `make web-build` still succeeds.
- [ ] 6.2 Terraform plan/apply succeeds in CI.
