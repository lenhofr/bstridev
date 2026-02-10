# Project Context

## Purpose
This repo is the source of truth for **barsportsdev.com** (Bar Sports Triathlon): a static website that publishes event info, rules, payouts/scoring, and past results.

## Tech Stack
- **Web**: Next.js (App Router) + React + TypeScript (`web/`)
- **Styling**: plain global CSS (`web/app/globals.css`) + `next/font` Google fonts (no Tailwind)
- **Infrastructure**: Terraform for AWS (`infra/terraform/app`)
- **CI/CD**: GitHub Actions w/ AWS OIDC; builds a static export and deploys to S3/CloudFront (`.github/workflows/*`)

## Project Conventions

### Code Style
- TypeScript/TSX, React functional components.
- Use server components by default; add `'use client'` only when needed (hooks, `usePathname`, etc.).
- Keep formatting consistent with existing code (2-space indent, semicolons, and single quotes are the current convention; there is no enforced Prettier/ESLint config in-repo).
- Routing/layout conventions:
  - Pages: `web/app/**/page.tsx`
  - Root layout: `web/app/layout.tsx`
  - Shared UI: `web/app/_components/*`

### Architecture Patterns
- **Static export only**: `web/next.config.mjs` sets `output: 'export'` and `images: { unoptimized: true }`.
  - Avoid features that require a server runtime (e.g., non-static route handlers, server actions that assume Node at runtime, dynamic rendering).
- Content is currently mostly hard-coded in page components; if content grows, prefer simple in-repo modules (e.g., `web/app/_data/*.ts`) rather than adding a backend.
- Build artifact: `web/out` (produced by `npm run build`).

### Testing Strategy
- No dedicated automated test suite is currently configured.
- CI/CD implicitly validates changes by running `npm run build` (Next.js build + static export).
- For local validation:
  - `make web-dev` (dev server; defaults to `PORT=3005`)
  - `make web-build` (build that matches CI)

### Git Workflow
- Primary branch: `main`.
- Changes should go through PRs.
- GitHub Actions:
  - Terraform **plan** runs on PRs that touch `infra/terraform/app/**`.
  - Terraform **apply** runs on pushes to `main`.
  - Static site **deploy** runs on pushes to `main` that touch `web/**` (and also after a successful Terraform apply).

## Domain Context
- “Bar Sports Triathlon” = Bowling + Pool + Darts.
- Each event includes 3 games per sport; games are scored separately and points are totaled for overall standings.
- The site contains pages for rules, payouts/scoring, contact info, and past results (split into “Old Guys” and “Young Guys” brackets).

## Important Constraints
- Must remain compatible with Next.js static export (no server-side runtime assumptions).
- AWS region is `us-east-1` (per workflows).
- AWS auth in CI uses GitHub Actions OIDC roles (avoid long-lived AWS keys).

## External Dependencies
- **AWS**: S3 (site hosting), CloudFront (CDN), Route53 (DNS), IAM (OIDC roles/policies).
- **Terraform**: state backend and app stack under `infra/terraform/**`.
- **GitHub Actions**: `aws-actions/configure-aws-credentials`, `hashicorp/setup-terraform`, `actions/setup-node`.
