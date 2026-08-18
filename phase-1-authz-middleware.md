# TASK
Phase 1 — Server-side authorization middleware. Build and unit-test the authentication/authorization layer that Phase 2 will wire into the existing API routes. Do not modify any existing route in this phase.

# ROLE
You are a senior backend engineer working inside the AcademyHub repository (Next.js 15 / React 19 / Firebase Auth / Prisma / Postgres). You are executing one bounded, reviewable phase of a larger migration plan. You do not have authority to expand scope beyond what is specified below.

# CONTEXT
Phase 0 (already complete, on `origin/main`) added `prisma/schema.prisma`, an initial migration, and `lib/prisma.ts` — a Postgres data layer that nothing in the application uses yet. The original security review found that AcademyHub's four API routes (`/api/gemini`, `/api/biomechanics/evaluate`, `/api/stripe/create-checkout-session`, `/api/stripe/webhook`) had zero server-side identity verification, and that Firestore rules had a privilege-escalation flaw allowing any user to self-assign the `admin` role.

This phase builds the fix for both problems as a reusable, independently testable layer — not by wiring it into the live routes yet (that's Phase 2), but by proving it works correctly in isolation first, against a mocked Prisma client and mocked Firebase Admin SDK. This mirrors how Phase 0 proved the schema was correct without a live database.

# OBJECTIVE
Produce `lib/auth/` containing:
1. A function that verifies a Firebase ID token from an incoming request and returns the authenticated user's UID and custom claims, rejecting the request if the token is missing, malformed, or invalid.
2. A function that checks the authenticated user has one of a required set of roles (`admin`, `coach`, `parent`), reading the role **only** from Firebase custom claims — never from a Firestore or Postgres fallback lookup. This is the direct fix for the privilege-escalation bug: role must come from a claim that only server-side code (via `functions/setUserRole.ts`, already Admin-SDK-gated) can set, not from a document a user can write to themselves.
3. A function that checks resource ownership — given an authenticated `parentUserId` and a resource type (`athlete`, `invoice`), confirms via Prisma that the resource's `parentUserId` matches the caller, or that the caller has `coach`/`admin` role. This must query the Postgres schema from Phase 0, not Firestore.

All three must be composable, so a route handler in Phase 2 can do something like: authenticate → require role OR ownership → proceed/reject, in a small number of readable lines.

# PROBLEM
Currently: `grep -rn "verifyIdToken" --include=*.ts --include=*.tsx .` returns zero results anywhere in the codebase. No route checks who is calling it. The Firestore rules' role-checking function has a fallback path (`getUserData().role == role`) that reads a Firestore document a user can write to themselves — this is what let any user grant themselves admin. The new authz layer must not reproduce this fallback pattern in any form.

# EXISTING BEHAVIOR
- `lib/firebaseAdmin.ts` — already initializes the Firebase Admin SDK singleton (`adminDb`, and `admin` default export giving access to `admin.auth()`). Use this; do not reinitialize Admin SDK elsewhere.
- `functions/setUserRole.ts` — a Cloud Function, already correctly gated (`context.auth.token.role !== 'admin'` throws), that sets custom claims via `admin.auth().setCustomUserClaims(uid, { role })`. This is the only legitimate path role should ever be set through. Do not modify this file; it is correct as-is.
- `lib/authContext.tsx` — client-side, reads `idTokenResult.claims.role` with a Firestore fallback. This fallback is a client-side UX convenience for pre-Phase-2 code and is out of scope for this phase; do not modify it. Phase 2 will address whether it needs to change once routes are wired.
- `prisma/schema.prisma` (Phase 0) — `User.id` is the Firebase Auth UID. `Athlete.parentUserId` and `Invoice.parentUserId` are the ownership anchors.

# DESIRED BEHAVIOR
After this phase:
- `lib/auth/verifyRequestAuth.ts` (or equivalent name) exists, exported, fully unit tested with a mocked `admin.auth().verifyIdToken`.
- `lib/auth/requireRole.ts` exists, unit tested, proven to reject when claims are absent or claims role doesn't match, and to never consult Firestore or Postgres for role.
- `lib/auth/requireOwnership.ts` exists, unit tested with a mocked Prisma client, proven to allow the resource owner or a coach/admin, and reject everyone else.
- None of this is imported by any existing route yet. `git diff --stat` against Phase 0's HEAD should show only new files under `lib/auth/` (implementation + tests) and possibly a `package.json` addition if a mocking library is needed that isn't already present (check `vitest` config first — it may already support what you need without new dependencies).

# RELEVANT FILES TO INSPECT FIRST
- `lib/firebaseAdmin.ts`
- `functions/setUserRole.ts`
- `lib/authContext.tsx` (read-only, for context)
- `prisma/schema.prisma` (Phase 0 output)
- `lib/prisma.ts` (Phase 0 output)
- `firestore.rules` — specifically the `hasRole()` and `isParentOf()` functions — read these as the specification of *what bug not to reproduce*, not as a pattern to port.
- `app/api/biomechanics/evaluate/route.test.ts` — existing test file, for house style/conventions on mocking and assertions in this repo's Vitest setup.
- `vitest.config.mts` — confirm test environment and existing mock patterns before adding new ones.

# ARCHITECTURAL CONSTRAINTS
- Do not modify any file under `app/api/`. Zero route wiring in this phase.
- Do not modify `functions/setUserRole.ts`, `lib/authContext.tsx`, `lib/firebaseAdmin.ts`, or any Phase 0 file (`prisma/schema.prisma`, `lib/prisma.ts`, migration files). If you believe Phase 0's schema needs a change to support this phase, stop and report it rather than editing it — schema changes need to be reviewed separately.
- All new code lives under `lib/auth/`.
- Role must be sourced exclusively from `request.auth.token.role`-equivalent (i.e., decoded custom claims from `verifyIdToken`). If you find yourself writing any code path that reads role from a database as a fallback, stop — that is the exact bug this phase exists to prevent, in a new location.
- Ownership checks must use the Prisma client (`lib/prisma.ts`) and the Phase 0 schema, not Firestore.

# SECURITY REQUIREMENTS
- Token verification must reject expired tokens, tokens with invalid signatures, and missing `Authorization` headers — write a test for each case explicitly, don't just test the happy path.
- `requireRole` must fail closed: if claims are missing, undefined, or malformed, deny — never default to allow.
- `requireOwnership` must fail closed on any Prisma error (e.g. resource not found) — a database error must never be interpreted as "allowed."
- Do not log or expose the full decoded token or any claim contents in error responses — error messages returned to a rejected caller should be generic ("unauthorized" / "forbidden"), not leak whether a resource exists or who owns it.

# UX REQUIREMENTS
Not applicable — no UI surface in this phase.

# DATA REQUIREMENTS
- `requireOwnership` must be written against the Phase 0 Prisma schema exactly as it exists — do not add new fields to support this phase. If the schema is missing something you need, stop and report it; do not invent a field.
- No live Postgres or Firebase project connection is required or permitted in this phase's tests. All Firebase Admin and Prisma calls must be mocked in tests (e.g. via `vi.mock`). If a test requires a real network or database connection to pass, that test is wrong for this phase.

# IMPLEMENTATION GUIDANCE
1. Read every file listed above in full before writing code.
2. Design the three functions with clear, narrow responsibilities so Phase 2 can compose them without duplicating logic per-route.
3. Write tests first or alongside — do not write the implementation and then retrofit tests to make it pass; write tests that reflect the security requirements above as explicit cases (expired token, missing header, wrong role, no role, non-owner, database error) before considering the function complete.
4. Keep the API surface small — resist the urge to build a generic policy engine. Three functions, composed by hand in Phase 2, is the right amount of abstraction for this codebase's size.

# DO NOT DO
- Do not wire this into any existing route.
- Do not modify `functions/setUserRole.ts`, `lib/authContext.tsx`, `lib/firebaseAdmin.ts`, or any Phase 0 file.
- Do not add a Firestore- or Postgres-based fallback for role resolution, under any name, for any reason.
- Do not add new fields to the Prisma schema to make this phase easier — report the gap instead.
- Do not add dependencies beyond what's strictly needed for mocking in tests, and check `package.json`/`vitest.config.mts` first to see what's already available.
- Do not invent fields, functions, or config not traceable to the files listed above. If something is genuinely ambiguous, add a `// TODO: confirm with product` comment and name it explicitly in your final report — do not silently guess and omit it from the report. (Note: in Phase 0, `CoachProfile` fields like `attendanceRate`/`churnRisk`/`retentionScore`/`batchFillRate` were added without being traceable to any inspected file and were not flagged in the report. Do not repeat that pattern — if you add something not directly traceable to a file above, it must appear in your report's TODO section, no exceptions.)

# ACCEPTANCE CRITERIA
- `lib/auth/` contains the three functions described, each independently unit tested.
- Explicit test cases exist for: valid token, missing header, malformed token, expired/invalid token, valid role, missing role, wrong role, resource owner, non-owner, coach/admin override, and a simulated database error on the ownership check.
- No code path anywhere in `lib/auth/` reads role from anywhere other than decoded custom claims.
- `git diff --stat` against the current `origin/main` HEAD shows changes confined to `lib/auth/` and, if unavoidable, `package.json`/`package-lock.json` for a test-only dependency — nothing else.
- `npx tsc --noEmit`, `npx next build`, and `npx vitest run` all pass, with the full existing test suite (5 tests from Phase 0's baseline) still passing alongside the new Phase 1 tests.

# TESTING / VERIFICATION
Run and report the output of, in order:
1. `npx vitest run` (full suite — must show both the existing 5 tests and the new Phase 1 tests, all passing)
2. `npx tsc --noEmit`
3. `npx next build`
4. `git diff --stat` against the current `origin/main` HEAD (state the base commit hash you diffed against)

# FINAL REPORT — REQUIRED FORMAT
1. **Files created**, with a one-line description of each.
2. **Full test list** — every test case name and pass/fail status, not just a summary count.
3. **Any TODO-flagged item** not directly traceable to the inspected files (or "none").
4. **Full output** of all four verification commands above.
5. **Explicit confirmation**: "No existing route, component, hook, or Phase 0 file was modified" — or, if something had to change, name exactly what and why, and stop for approval before proceeding further.
6. **One paragraph** stating what Phase 2 will need to do to actually use this layer (which functions to call, in what order, in each of the four existing routes) — this is a plan for the next phase, not an implementation of it.
