# AcademyHub Known Issues & Outstanding Deficiencies

This document lists open issues, architectural limitations, and known bugs in AcademyHub, categorized by severity.

---

## High Severity

### 1. [RESOLVED] `gemini-3.6-flash` Model Identifier Live Verification
- **Date Resolved**: 2026-08-23
- **Resolution**: `gemini-3.6-flash` was confirmed valid via a live API execution using `@google/genai ^2.4.0` with `GEMINI_API_KEY`, returning: `VALID: Pong! 🏓 How can I help you today?`. Model identifier consolidated into `DEFAULT_AI_MODEL` in `lib/env.ts` with non-blocking startup validation in `instrumentation.ts`.
- **Historical Context**: The identifier remained unverified through Phases B-F due to missing local API keys, with routes degrading gracefully to deterministic scoring.

### 2. Multi-Membership Users Hard-Blocked at Authentication
- **Description**: `verifyRequestAuth` queries `Membership` records for a user. If a user belongs to more than 1 academy, `verifyRequestAuth` throws an `AuthError(403)` stating multi-academy access is not yet implemented.
- **Impact**: Users with multiple memberships cannot access any academy route.
- **Remediation**: Implement a tenant selection mechanism (e.g., `x-academy-id` header or session state) allowing multi-membership users to select their active academy context.

### 3. Billing Routes Gated Off Due to Client-Side Money Calculation & Installment Defect
- **Description**:
  1. `POST /api/invoices` relies on client-provided monetary amounts (`subtotal`, `netTotal`) without server-side recalculation.
  2. The `UPFRONT` payment schedule calculation produces installments that sum to 95% of `netTotal` (5% calculation discrepancy).
- **Impact**: Billing routes are gated off (`BILLING_ENABLED=false`) returning HTTP 503 to prevent financial errors.
- **Remediation**: Rewrite `billingService.ts` to perform authoritative server-side subtotal, discount, tax, and installment calculations before re-enabling routes.

### 4. `POST /api/athletes` Parent Lookup Resolves Globally Across Tenants
- **Description**: In `app/api/athletes/route.ts`, when creating an athlete with a `parent_email`, the route resolves the parent user by email globally (`prisma.user.findUnique({ where: { email } })`) without verifying that the parent has an active `Membership` in the caller's `academyId`.
- **Impact**: An athlete can be registered under a parent user who has no membership in that academy, preventing the parent from seeing their child in their dashboard.
- **Remediation**: Filter parent resolution by verifying `Membership` exists for `parentUser.id` and `user.academyId`.

---

## Medium Severity

### 5. AI Evaluation Round-Trips Scores Through Client Component
- **Description**: The biomechanics evaluation UI flow sends assessment inputs to `/api/biomechanics/evaluate`, receives calculated scores and AI insights, and then posts the full payload back to `/api/assessments` to save.
- **Impact**: A malicious user or tampered client script can alter `computed_score`, `rubric_grade`, or `agent_insights` before persisting them to PostgreSQL.
- **Remediation**: Combine evaluation and persistence into a single server-side endpoint.

### 6. Missing Update & Delete Endpoints for Athletes and Assessments
- **Description**: Neither `/api/athletes` nor `/api/assessments` provides `PUT`, `PATCH`, or `DELETE` route handlers.
- **Impact**: Athletes and assessments cannot be edited or deleted once created, creating a data-rights gap (GDPR/CCPA compliance).
- **Remediation**: Add `PATCH` and `DELETE` handlers for `/api/athletes/[id]` and `/api/assessments/[id]` with `requireOwnership` guards.

### 7. Scheduling Feature Operates on `localStorage` Only
- **Description**: Although PostgreSQL schema defines `Schedule` and `CoachProfile` tables, `components/scheduling/SchedulingSection.tsx` persists schedules exclusively in browser `localStorage`.
- **Impact**: Schedule data is not shared across devices or persisted in PostgreSQL.
- **Remediation**: Implement CRUD API routes (`/api/schedules`) backed by `prisma.schedule`.

---

## Low Severity

### 8. Hardcoded Zero Counters on Main Dashboard
- **Description**: `app/page.tsx` renders dashboard metrics cards with hardcoded zero counters (`0 Athletes`, `0 Assessments`).
- **Impact**: Dashboard statistics do not reflect real database counts.
- **Remediation**: Connect dashboard metric cards to aggregate queries (`prisma.athlete.count()`, `prisma.assessment.count()`).

### 9. Token Validity Enumeration on Invite Acceptance
- **Description**: `POST /api/invites/accept` returns HTTP 403 when an existing user is not logged in, but returns HTTP 400 for an invalid token.
- **Impact**: Allows an unauthenticated caller who possesses a valid token to determine that the token is valid before logging in.
- **Remediation**: Harmonize response codes or require session authentication prior to token inspection for existing users.

### 10. Rate Limiting Count-Then-Create Non-Atomic Under Concurrency
- **Description**: `checkAndRecordAiUsage` in `lib/auth/rateLimitAi.ts` counts existing `AiUsage` records and then creates a new row if below limits.
- **Impact**: Highly concurrent requests from the same user or academy within milliseconds may bypass the rate limit by 1-2 requests.
- **Remediation**: Acceptable trade-off for current scale; can be upgraded to atomic upsert or Redis sliding window if concurrency increases.
