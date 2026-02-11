# Change: Add protected admin scoring page

## Why
Once we have a stable scoring data model, we want an authenticated admin experience to enter/update scores for the current event (yearly triathlon) across bowling/pool/darts and publish consistent results.

## Prerequisite
- This change depends on the canonical scoring data model defined in: `changes/add-scoring-data-model/`.

## What Changes
- Add a protected admin UI at `/admin/scoring` to manage scoring for a selected event (default: current year).
- Add the AWS-native auth + write API needed for admin edits (Cognito + API Gateway/Lambda + DynamoDB).
- Support a draft → published workflow, using the canonical scoring document.

## Impact
- Affected specs:
  - `admin-scoring` (new)
  - `scoring-backend` (new)
- Affected code:
  - `web/app/**` (new route + admin UI)
  - `infra/terraform/app/**` (auth + API + Dynamo)

## Non-Goals (initially)
- Building a general-purpose event registration system.
- Complex RBAC beyond “admin vs not admin”.
