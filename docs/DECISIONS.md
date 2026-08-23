# AcademyHub Architectural Decisions Log

This document records the core architectural decisions made in AcademyHub, including rationale, rejected alternatives, and consequences.

---

### Decision 1: `Membership` Join Table over `User.academyId`

- **Context**: Users (such as parents or multi-location coaches) may belong to more than one sports academy.
- **Decision**: Represent tenant association via a explicit `Membership` join table (`userId`, `academyId`, `role`) with a compound unique constraint (`@@unique([userId, academyId])`).
- **Rejected Alternative**: Placing an `academyId` foreign key directly on the `User` table.
- **Why**: `email` is globally unique across the platform. Placing `academyId` on `User` would force users to create duplicate accounts with different email addresses to join a second academy.
- **Consequence**: `verifyRequestAuth` must query the `Membership` table on every request to resolve active tenant context.

---

### Decision 2: Roles Resolve from Postgres on Every Request, Not Session Claims

- **Context**: Better Auth supports custom session claims or JWT tokens.
- **Decision**: Resolve user roles dynamically by querying `prisma.membership` in `verifyRequestAuth` during request authentication.
- **Rejected Alternative**: Storing `role` or `academyId` inside session cookies or JWT tokens.
- **Why**: Session claims go stale (for up to an hour) when a user's role or membership is modified or revoked. Storing claims created two competing sources of truth, causing cross-tenant permission bypasses.
- **Consequence**: Every authenticated request incurs a fast indexed Postgres lookup for `Membership`.

---

### Decision 3: Explicit Tenant Filters over Prisma Client Extensions or PostgreSQL RLS

- **Context**: Multi-tenant isolation requires filtering queries by `academyId`.
- **Decision**: Explicitly pass `where: { academyId: user.academyId }` in service layer queries and verify ownership via `requireOwnership(user, type, id)`.
- **Rejected Alternative**: Automatic query rewriting via Prisma Client extensions or PostgreSQL Row-Level Security (RLS).
- **Why**: Automatic Prisma query injection silently fails on raw queries, nested includes, or complex aggregations. RLS relies on session variables (`SET LOCAL app.current_tenant`) that conflict with connection pooling tools like PgBouncer.
- **Consequence**: Code reviews and unit tests must verify `academyId` inclusion on every read and write query.

---

### Decision 4: Platform Admin as a `User` Boolean, Not a Tenant Role

- **Context**: System administrators need platform-wide management capabilities (creating academies, managing system invites).
- **Decision**: Implement platform administration via an explicit `isPlatformAdmin` boolean column on `User` gated by `requirePlatformAdmin`.
- **Rejected Alternative**: Defining `PLATFORM_ADMIN` as a role value inside `Membership.role`.
- **Why**: `Membership` is scoped to a specific `academyId`. Introducing a tenant-less or cross-tenant membership role required global bypass logic inside tenant resolution, which caused cross-tenant data leaks in earlier phases.
- **Consequence**: Platform admin capabilities are strictly separated from academy tenant resolution.

---

### Decision 5: Invitation-Only Onboarding with Self-Set Credentials

- **Context**: User onboarding and account creation security.
- **Decision**: Close public sign-up (`emailAndPassword.enabled` gated by `internalInviteScope`). Accounts are created exclusively via invitation tokens (`/invite/[token]`), where invitees set their own password via Better Auth.
- **Rejected Alternative**: Public registration or manager-provisioned temporary passwords.
- **Why**: Open sign-up allows arbitrary users to insert `User` rows. Manager-set passwords expose credentials to academy managers and create account takeover vectors.
- **Consequence**: All account creation requires an invitation token issued by a Platform Admin or Academy Admin.

---

### Decision 6: USD Currency Standard Without Currency Column

- **Context**: Financial calculations in invoices and billing ledger.
- **Decision**: Standardize all monetary values on USD ($) without storing a currency code column in database tables.
- **Rejected Alternative**: Multi-currency support or adding a `currency` string column.
- **Why**: AcademyHub currently operates in a single-currency market. Adding a currency column adds schema complexity without business requirement. If multi-currency is required in the future, backfilling a default `'USD'` column is trivial.
- **Consequence**: Application UI and billing services assume USD currency formatting.

---

### Decision 7: Deferred Features

- **Billing Service Execution**: Invoicing and billing routes (`/api/invoices`) are gated off with HTTP 503 (`BILLING_ENABLED=false`) pending server-side calculation validation.
- **Coach <-> Athlete Direct Assignment**: Athletes currently belong to an academy; direct coach-to-athlete roster assignments are deferred.
- **Multi-Membership Tenant Switcher**: Users with multiple memberships are currently hard-blocked by `verifyRequestAuth` until a tenant switcher UI and header selection mechanism is built.
