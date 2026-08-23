# AcademyHub Architecture Overview

## 1. Core Technology Stack

- **Framework**: Next.js 15 (App Router, dynamic API routes)
- **Language**: TypeScript 5 (Strict Mode)
- **Styling**: Vanilla CSS (`app/globals.css` with CSS custom properties)
- **Authentication**: Better Auth (Credential provider, closed sign-up)
- **Database & ORM**: PostgreSQL 16 + Prisma ORM 6
- **AI Integration**: `@google/genai` (Gemini API proxy and biomechanics evaluation engine)

---

## 2. Multi-Tenant Data Model

Every tenant-owned entity in AcademyHub is isolated by `academyId`.

```
           +------------------+
           |     Academy      |
           +------------------+
                     ^
                     | 1:N
           +------------------+
           |    Membership    | <--- @@unique([userId, academyId])
           +------------------+
                     ^
                     | 1:N
           +------------------+
           |       User       |
           +------------------+
```

- **`Academy`**: Represents a distinct sports academy organization (`id`, `name`, `slug`, `isActive`).
- **`Membership`**: Join table linking `User` to `Academy` with a compound unique constraint (`@@unique([userId, academyId])`). Defines tenant-scoped role (`ADMIN`, `COACH`, `PARENT`).
- **Tenant-Owned Entities**: `Athlete`, `Assessment`, `Invoice`, `Schedule`, and `CoachProfile` each have a required, indexed `academyId` column with `onDelete: Cascade` referencing `Academy(id)`.

---

## 3. Request Authentication & Authorization Pipeline

Every protected API route processes requests through a three-stage server-side guard pipeline:

```
[ Incoming Request ]
         |
         v
 1. verifyRequestAuth(req)   --> Resolves Better Auth session & Postgres Membership
         |
         v
 2. requireRole(user, roles) --> Enforces allowed roles ('admin', 'coach', 'parent')
         |
         v
 3. requireOwnership(user, type, id) --> Verifies resource.academyId === user.academyId
```

1. **`verifyRequestAuth(request)`**:
   - Validates session cookie via Better Auth (`auth.api.getSession`).
   - Fetches the user's `Membership` records directly from PostgreSQL.
   - If the user has exactly one active membership, resolves `AuthUser` with `{ uid, email, isPlatformAdmin, academyId, role }`.
   - If the user has no memberships, returns `AuthUser` with `undefined` `role` and `academyId` (fails closed on role requirement).
2. **`requireRole(user, allowedRoles)`**:
   - Asserts `user.role` is present in `allowedRoles`. Throws `AuthError(403)` if unauthorized.
3. **`requireOwnership(user, resourceType, resourceId)`**:
   - Queries target record (`athlete`, `invoice`, or `assessment`) from PostgreSQL.
   - Verifies `resource.academyId === user.academyId` for all roles (prevents cross-tenant access).
   - For `parent` role, additionally verifies `resource.parentUserId === user.uid`.

---

## 4. Account Onboarding & Invitation Flow

Public registration is closed (`internalInviteScope`). Account creation follows an explicit invitation hierarchy:

1. **Platform Admin**:
   - `isPlatformAdmin: true` flag on `User`.
   - Creates new academies (`POST /api/platform/academies`) and initial academy manager invites (`POST /api/platform/invites`).
2. **Academy Admin**:
   - Invites coaches or parents to their academy (`POST /api/invites`).
   - Rejects attempt to invite `ADMIN` role via standard route.
3. **Invitee Acceptance (`/invite/[token]`)**:
   - Accepts token via `POST /api/invites/accept`.
   - **New User**: Creates Better Auth credential user inside `internalInviteScope.run(true)` and creates `Membership`.
   - **Existing User**: Requires authenticated session matching target email and attaches new `Membership` without modifying account credentials.

---

## 5. Feature Gating & Cost Controls

- **Billing Service Gating**:
  - Gated off by default (`BILLING_ENABLED=false`).
  - `POST /api/invoices`, `GET /api/invoices`, `GET /api/invoices/[id]`, and `PATCH /api/invoices/[id]` return HTTP 503 Service Unavailable when billing is disabled.
  - Gating check runs **after** `verifyRequestAuth` to prevent unauthenticated route probing.
- **AI Proxy & Cost Protection**:
  - `/api/gemini` restricted to `admin` and `coach` roles only (HTTP 403 for parents).
  - Missing `GEMINI_API_KEY` yields HTTP 503 (no simulated advice).
  - Rate limiting enforced via `AiUsage` table: 10 calls/min per user, 1000 calls/month per academy. Usage row recorded **before** model invocation.
  - Prompt inputs delimited with XML tags (`<user_prompt>`, `<coach_notes>`) and enforced max length caps (HTTP 400 on overflow).
