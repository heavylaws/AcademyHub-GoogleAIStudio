# AcademyHub Known Issues & Outstanding Deficiencies

This document lists open issues, architectural limitations, and known bugs in AcademyHub, categorized by severity.

---

## High Severity

### 1. [RESOLVED] `gemini-3.6-flash` Model Identifier Live Verification
- **Date Resolved**: 2026-08-23
- **Resolution**: `gemini-3.6-flash` was confirmed valid via a live API execution using `@google/genai ^2.4.0` with `GEMINI_API_KEY`, returning: `VALID: Pong! 🏓 How can I help you today?`. Model identifier consolidated into `DEFAULT_AI_MODEL` in `lib/env.ts` with non-blocking startup validation in `instrumentation.ts`.
- **Historical Context**: The identifier remained unverified through Phases B-F due to missing local API keys, with routes degrading gracefully to deterministic scoring.

### 2. [RESOLVED] Multi-Membership Users Hard-Blocked at Authentication
- **Date Resolved**: 2026-08-27
- **Resolution**: Implemented `X-Academy-Id` header resolution in `verifyRequestAuth`. When a user has multiple memberships and omits the header, the API returns a `409 Conflict` containing a list of their authorized academies. Additionally, invite acceptance (`POST /api/invites/accept`) was updated with an atomic rollback mechanism to clean up orphaned `User` and `Account` rows on transaction failure.
- **Historical Context**: The multi-tenant architecture initially threw a `403` to block multi-academy users.

### 3. Billing Routes Gated Off Due to Client-Side Money Calculation & Installment Defect
- **Description**:
  1. `POST /api/invoices` relies on client-provided monetary amounts (`subtotal`, `netTotal`) without server-side recalculation.
  2. The `UPFRONT` payment schedule calculation produces installments that sum to 95% of `netTotal` (5% calculation discrepancy).
- **Impact**: Billing routes are gated off (`BILLING_ENABLED=false`) returning HTTP 503 to prevent financial errors.
- **Remediation**: Rewrite `billingService.ts` to perform authoritative server-side subtotal, discount, tax, and installment calculations before re-enabling routes.

### 4. [RESOLVED] Parent Lookup Resolves Globally Across Tenants
- **Date Resolved**: 2026-08-27
- **Resolution**: Updated `POST /api/athletes` and `POST /api/invoices` to query `prisma.membership` using a composite key `userId_academyId`, strictly scoping parent lookups and authorization to the caller's active tenant (`user.academyId`).
- **Historical Context**: Previously resolved parent by global email or ID in `POST /api/athletes`, which allowed registering athletes to parents lacking membership in the caller's academy.

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
