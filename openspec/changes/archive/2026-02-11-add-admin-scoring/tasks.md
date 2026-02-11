## 1. Spec + design alignment
- [x] 1.1 Confirm scoring model: raw scores vs points vs both; confirm entities (team vs individual).
- [x] 1.2 Confirm admin access model (fixed admins in Cognito vs invite flow).

## 2. Infrastructure (Terraform)
- [x] 2.1 Add Cognito User Pool + app client + hosted UI domain.
- [x] 2.2 Add API Gateway + Lambda(s) + JWT authorizer.
- [x] 2.3 Add DynamoDB tables for Events and Scores (draft + published).
- [x] 2.4 Output API base URL + Cognito config (user pool id, client id, hosted UI URL) from Terraform.

## 3. Backend implementation
- [x] 3.1 Implement API endpoints for event metadata + scoring CRUD.
- [x] 3.2 Implement publish workflow (draft → published).
- [x] 3.3 Add input validation and clear error responses.

## 4. Web app (Next.js)
- [x] 4.1 Add `/admin/scoring` route (client component) with login flow.
- [x] 4.2 Admin UI: select event (default current year), edit scores for bowling/pool/darts (3 games each).
- [x] 4.3 Compute derived totals/points and show a preview.
- [x] 4.4 Publish action that promotes draft to published.

## 5. Public consumption
- [x] 5.1 Add read-only data fetch for published results (new/updated results page).
- [x] 5.2 Provide fallback behavior if no published data exists.

## 6. Validation
- [x] 6.1 `make web-build` still succeeds.
- [x] 6.2 Terraform plan/apply succeeds in CI.

## 7. Fixtures / test docs
- [x] 7.1 Create a small set of **raw JSON scoring documents** for common scenarios (ties, duplicate places, incomplete pool head-to-head, pool run tiebreaker-only).
- [x] 7.2 Document how to load these fixtures for local testing (e.g. copy/paste into localStorage, or import via a small dev-only helper).
