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

### 6. [RESOLVED] Missing Update & Delete Endpoints for Athletes and Assessments
- **Date Resolved**: 2026-08-23
- **Resolution**: Added `PATCH` and `DELETE` route handlers for `/api/athletes/[id]` and `/api/assessments/[id]` with `requireOwnership` guards and soft-deletion (`deletedAt`) support (resolving commit `f34f34e` / PR #3).
- **Historical Context**: Neither `/api/athletes` nor `/api/assessments` initially provided update or delete paths.

### 7. [RESOLVED] Scheduling Feature Operates on `localStorage` Only
- **Date Resolved**: 2026-08-23
- **Resolution**: Implemented CRUD API routes (`/api/schedules` and `/api/schedules/[id]`) backed by `prisma.schedule` with transactional court reservation conflict checking and connected UI (resolving commit `19ede42` / PR #4).
- **Historical Context**: Scheduling previously persisted exclusively in browser `localStorage`.

---

## Low Severity

### 8. [RESOLVED] Hardcoded Zero Counters on Main Dashboard
- **Date Resolved**: 2026-08-23
- **Resolution**: Implemented `/api/dashboard/metrics` with real Prisma aggregate queries and connected dashboard UI KPI cards (resolving commit `8a876f7` / PR #5).
- **Historical Context**: Dashboard metrics cards initially rendered static zero values.

### 9. Token Validity Enumeration on Invite Acceptance
- **Description**: `POST /api/invites/accept` returns HTTP 403 when an existing user is not logged in, but returns HTTP 400 for an invalid token.
- **Impact**: Allows an unauthenticated caller who possesses a valid token to determine that the token is valid before logging in.
- **Remediation**: Harmonize response codes or require session authentication prior to token inspection for existing users.

### 10. Rate Limiting Count-Then-Create Non-Atomic Under Concurrency
- **Description**: `checkAndRecordAiUsage` in `lib/auth/rateLimitAi.ts` counts existing `AiUsage` records and then creates a new row if below limits.
- **Impact**: Highly concurrent requests from the same user or academy within milliseconds may bypass the rate limit by 1-2 requests.
- **Remediation**: Acceptable trade-off for current scale; can be upgraded to atomic upsert or Redis sliding window if concurrency increases.

### 11. Raw Audit Log Metadata Exposure
- **Description**: Audit log metadata is returned raw to authorized clients without field filtering.
- **Impact**: Unfiltered metadata could accidentally expose sensitive context if rich data is logged in the future.
- **Remediation**: Implement a field allowlist on audit metadata before logging any richer data payloads.

### 12. Non-Time-Ordered Cursor Pagination in Audit Log Endpoints
- **Description**: `/api/audit` and `/api/platform/audit` perform cursor pagination using `cursor: { id }` with `orderBy: { createdAt: 'desc' }`.
- **Impact**: `cuid()` values are not strictly time-ordered, so audit log rows that share an identical `createdAt` timestamp can be skipped or duplicated across page boundaries.
- **Remediation**: Upgrade to a composite cursor `(createdAt, id)` at higher log volumes.

### 13. Non-Deterministic Fixture Queries in Auth Integration Tests
- **Description**: Integration test Cases 12-14 in `lib/auth/authFlow.integration.test.ts` perform `findFirst` queries against shared sequential database state.
- **Impact**: Tests can become non-deterministic if test execution order or initial DB state changes.
- **Remediation**: Refactor queries to use unique identifiers or isolated transaction fixtures.

### 14. Un-Rate-Limited Invite Acceptance Endpoint
- **Description**: `POST /api/invites/accept` lacks rate limiting.
- **Impact**: Invitation tokens could be subject to automated brute-force attacks.
- **Remediation**: Apply IP- or user-scoped rate limiting to invite acceptance endpoints.

