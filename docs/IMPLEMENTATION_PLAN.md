# AcademyHub Implementation Plan

## Verified findings

The following findings were checked against the repository at the current working tree and the brief’s claims. Where the repo contradicts the brief, the contradiction is called out explicitly.

### Confirmed as accurate

- `[lib/auth/verifyRequestAuth.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/lib/auth/verifyRequestAuth.ts)` verifies Firebase ID tokens and sources role solely from decoded custom claims; it rejects absent or malformed bearer tokens and does not read a database fallback. This matches the brief’s “fails closed” requirement.
- `[lib/auth/requireRole.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/lib/auth/requireRole.ts)` enforces `allowedRoles` strictly from `user.role`, with no database fallback and a 403 on missing or invalid role.
- `[lib/auth/requireOwnership.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/lib/auth/requireOwnership.ts)` anchors ownership on `parentUserId` for `athlete`, `invoice`, and `assessment` resources and fails closed on not-found and database errors.
- `[prisma/schema.prisma](/home/sc/AcademyHub.worktrees/pasted-text-processing/prisma/schema.prisma)` is normalized around Postgres with `AthleteSport`, `InvoiceChild`, and `Installment` as proper junction/child tables.
- `[functions/setUserRole.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/functions/setUserRole.ts)` only works when a caller already has a valid admin role and is therefore not usable as a bootstrap mechanism.
- `[app/page.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/app/page.tsx)` reads dashboard counters from `localStorage` and falls back to `4` athletes and `3` sessions when no values exist.
- `[components/scheduling/SchedulingSection.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/components/scheduling/SchedulingSection.tsx)` persists sessions to `localStorage` and performs conflict checks purely in-browser.
- `[app/api/stripe/create-checkout-session/route.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/app/api/stripe/create-checkout-session/route.ts)` calls `requireRole(user, ['parent', 'admin'])` but never `requireOwnership`, making arbitrary invoice lookup possible for any authenticated parent.
- `[app/api/invoices/route.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/app/api/invoices/route.ts)` allows `coach` access and uses `listInvoicesAdmin()` for coaches.
- `[lib/authContext.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/lib/authContext.tsx)` falls back to a Firestore document role when the claim is missing.
- `[firestore.rules](/home/sc/AcademyHub.worktrees/pasted-text-processing/firestore.rules)` still allows `users/{userId}` self-write for the same UID.
- `[app/api/gemini/route.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/app/api/gemini/route.ts)` returns a hardcoded sports-medicine paragraph when `GEMINI_API_KEY` is absent.
- `[prisma/schema.prisma](/home/sc/AcademyHub.worktrees/pasted-text-processing/prisma/schema.prisma)` defines money fields as `Float` for invoice and fee-related columns, including `Invoice.subtotal`, `Invoice.netTotal`, `Invoice.siblingDiscountAmount`, `AthleteSport.monthlyFee`, `InvoiceChild.monthlyFee`, and `Installment.amount`.
- `[package.json](/home/sc/AcademyHub.worktrees/pasted-text-processing/package.json)` contains no `postinstall: prisma generate` script.

### Corrected findings

- The repo does not currently show the brief’s “51 passing tests across 13 suites” result in a live environment. In the verification run here, `npx vitest run` reported `12 passed suites` and `55 passed tests`, with the single failing suite being `lib/auth/requireOwnership.integration.test.ts` because the required Postgres database `academyhub` does not exist in this environment. This is an environment failure, not a code-level RBAC regression.
- The brief says `functions/` is “undeployable” because there is no `firebase.json` and no `functions/package.json`. That is correct for the current tree: the `functions/` directory exists only as a single TypeScript file, but there is no deploy manifest and no `functions/package.json`.
- The brief says `firestore.rules` is never deployed. That is also correct as a repo state issue, but the file exists and is a real artifact. The problem is not that it is absent; the problem is that it is an orphaned ruleset with no deployment manifest tying it to a Firebase project.
- The repo does not presently contain a `docs/IMPLEMENTATION_PLAN.md` file; this task is to create it. That is expected and is the only output allowed by the brief.

### Role capability matrix

| Feature area | Admin | Coach | Parent |
| --- | --- | --- | --- |
| Authentication and role bootstrap | Full access. Creates/maintains role claims and admin-only flows. | Must authenticate, but no role assignment power. | Self-service registration; default role `parent`; no admin actions. |
| Athlete profiles | Full read/write. Can manage all athlete records. | Can view assigned athlete context when route logic allows it. | Can only view their own children and related assessments. |
| Assessments | Full visibility and administration. | Can read/write assessment data for active coaching workflows. | Can view their child’s assessment history only. |
| Scheduling | Can manage all bookings and conflict resolution. | Can view/create/upload schedule records for their own coaching context. | No scheduling write access; read-only or no access depending on route policy. |
| Billing | Full read/write/ledger approval. | Must be denied from billing read paths; no invoice ownership early-return. | Can view and manage only their own family invoices and payment status. |
| AI narrative | Can trigger and review parent-facing summaries when needed. | Can use AI features only in permitted surfaces. | Receives narrative summaries from own athlete data. |
| Seed/demo environment | One seeded admin account and bootstrap flow. | One seeded coach account. | One seeded parent account; no impersonation. |

## Open questions

- The brief assumes “first registrant becomes admin” when the `users` table is empty, but the repository does not yet define the exact registration API contract or the server-side first-user bootstrap path. The plan will treat this as a required implementation detail in Phase 1 rather than a speculative product feature.
- The repo does not define the exact UX for admin-only promotion from `parent` to `coach` / `admin`; the plan will keep this admin-only API path and assume an internal admin panel or restricted form, but no repository-level contract exists today.
- The timeline and hosting model for the demo seed environment are not specified by code. The plan assumes a developer-local or preview environment, not production Firebase Auth or a real Cloud SQL instance, and calls out that all seeded demo accounts must be created in the target demo environment, not a live production auth tenant.
- Currency and week structure are specified as QAR and Sunday–Thursday week, but the codebase currently mixes generic billing language and Stripe USD contributions. The plan treats QAR and Sunday–Thursday as a product requirement to be enforced in the demo data layer and UI copy.

## Phase 0 — Foundation fixes

### Objective
Create the financial and runtime foundations required for a believable demo database before any role-specific functionality is seeded or exercised.

### Files created, modified, and deleted

- Modified: `[package.json](/home/sc/AcademyHub.worktrees/pasted-text-processing/package.json)` — add `postinstall: prisma generate`.
- Modified: `[prisma/schema.prisma](/home/sc/AcademyHub.worktrees/pasted-text-processing/prisma/schema.prisma)` — convert `Float` money columns to `Decimal(10,2)` and align Prisma field names with the existing domain model.
- New: `prisma/migrations/` migration files generated by Prisma for the Decimal and data migration steps.
- Modified: service and type files that read/write billing values, including `[services/billingService.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/services/billingService.ts)`, `[services/billingAdminService.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/services/billingAdminService.ts)`, and `[types/billing.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/types/billing.ts)`.
- Potentially modified: `[app/api/invoices/route.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/app/api/invoices/route.ts)` and `[app/api/invoices/[id]/route.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/app/api/invoices/[id]/route.ts)` if they currently serialize values assuming `Float` semantics.
- Deleted: no application code deleted in this phase; the existing `functions/` directory is not touched here.

### Schema and migration impact

- Destructive migration is required because the schema currently uses `Float` for money and the seeded data / ledger logic expects all amounts to be precise.
- The database schema change is: `Invoice.subtotal`, `Invoice.netTotal`, `Invoice.siblingDiscountAmount`, `AthleteSport.monthlyFee`, `InvoiceChild.monthlyFee`, and `Installment.amount` become `Decimal(10,2)`; current application code is updated to accept/format Decimal values cleanly.
- Any `WHERE` or `ORDER BY` logic that uses money fields must be checked for type coercion and serialization differences between Prisma Decimal and JS number.
- Data migration should convert existing rows to QAR-aligned decimals with two decimal places and validate there are no precision-loss rows.

### API surface

- No new public route. This phase is foundational; it is not user-facing.
- Existing routes that mutate or read invoices and athlete fee data are treated as impacted surfaces and must be smoke-tested to ensure `Decimal` serialization behaves correctly.
- Response shapes remain the same externally, but values must render as strings or numbers according to the chosen API contract; the plan must not change the API contract without an explicit justification.
- Error cases: schema migration failure, invalid conversion of legacy records, and route-level serialization errors when values are returned as Decimal objects.

### Role behaviour matrix

- No user-visible role change. This phase is not a feature surface; it is precondition work that keeps seeded and live billing data truthful.
- Admin, coach, and parent see no UX changes in this phase, but all three will be affected by ledger correctness once Phase 6 begins.

### UI states

- No new user-facing screens. This phase is backend/data-only and should be verified in terminal output and migration logs.
- Loading/empty/error states are not introduced here; if a migration fails, the app will not start or the data layer will fail fast.

### Dependencies

- No earlier phase is required; this phase must happen before Phase 2 because seeded data writes money values.
- It also blocks the integrity of live invoice generation in Phase 6.

### Acceptance criteria

- `npx prisma generate` succeeds without requiring code edits to the client.
- `npx prisma validate` passes with the `Decimal(10,2)` schema.
- A Prisma migration runs cleanly against a Postgres instance and converts all money fields to Decimal without precision loss.
- A smoke route or script reads a seeded invoice and confirms `amount` values retain two-decimal precision.

### Verification steps

- `export DATABASE_URL='postgresql://.../academyhub?schema=public'`
- `npx prisma generate`
- `npx prisma validate`
- `npx prisma migrate deploy` or `npx prisma migrate dev --name phase0_decimal_money`
- `npx tsc --noEmit`
- `node -e "...read one invoice row and inspect Decimal output..."` or a route-level smoke test

### Risks

- Legacy data precision loss during conversion.
- Type mismatches between `Decimal` and JS `number` in billing UI logic.
- Incompatible `order by`/`sum` logic when values are serialized as strings instead of numbers.

### Estimated size

- Medium. The database contract change is small but anticipating all downstream service and UI assumptions makes it a foundational migration rather than a trivial patch.

## Phase 1 — Auth gate and role bootstrap

### Objective
Keep the app behind an auth gate, establish the first-admin bootstrap rule, and replace the Cloud Function-based role assignment with a Next.js server-side admin route that sets Firebase claims server-side only.

### Files created, modified, and deleted

- Modified: `[app/page.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/app/page.tsx)` to require authentication before rendering dashboard content and remove any guest dashboard assumptions.
- Modified: `[lib/authContext.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/lib/authContext.tsx)` to remove Firestore fallback role resolution and force token refresh after claim changes.
- Modified: `[components/Navbar.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/components/Navbar.tsx)` to show authenticated-only views and role-specific nav gating.
- Modified: `[lib/auth/verifyRequestAuth.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/lib/auth/verifyRequestAuth.ts)` and `[lib/auth/requireRole.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/lib/auth/requireRole.ts)` if further server-side validation is needed; the plan must not weaken them.
- Modified or new: app-level registration/auth route(s) under `app/api/` and any auth UI under `components/auth/` that already exist in the repo.
- Deleted: `[functions/setUserRole.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/functions/setUserRole.ts)` and the `functions/` package structure entirely.
- New: admin-only Next.js route for role assignment, likely under `app/api/users/role/route.ts` or an equivalent actual route path to be created consistent with project conventions.

### Schema and migration impact

- No destructive schema change required.
- The `users` table already stores `role` as an enum (`ADMIN`, `COACH`, `PARENT`) via `[prisma/schema.prisma](/home/sc/AcademyHub.worktrees/pasted-text-processing/prisma/schema.prisma)`, so the bootstrap logic should operate on the Postgres `users` table and Firebase custom claims.
- No new model is required unless an explicit registration audit table is added; the current brief does not require one.

### API surface

- New route: `POST /api/users/role` (or equivalent actual route path decided by the implementation) restricted to admin via `requireRole(user, ['admin'])`.
- Request shape: `{ uid: string, role: 'admin' | 'coach' | 'parent' }`.
- Response shape: `{ success: true, message: string }`.
- Error cases: 401 invalid/missing token, 403 non-admin, 400 invalid payload, 500 claim-set failure.
- New route or server action for registration: `POST /api/auth/register` or equivalent path, with server-side creation of Firebase user + Postgres `users` row using the bootstrap rule.
- Role bootstrap rule: if `users` table is empty, first registrant gets `admin`; all subsequent self-service sign-ups get `parent`; admin-only promotion is used for coach/admin assignments.
- Force-refresh flow: after claim change, the client must call `currentUser.getIdTokenResult(true)` or equivalent to update the role before re-render.

### Role behaviour matrix

- Admin: can access landing app shell after auth; can promote coach/admin users by admin route; sees admin-only controls.
- Coach: only after a valid coach claim; no ability to assign roles; blocked from admin-only areas.
- Parent: can register and self-assign to `parent`; cannot access admin-only routes.
- All roles: unauthenticated visitors see only sign-in/register state.

### UI states

- Loading: auth state fetch + claim refresh while tokens resolve.
- Empty: no user record yet in `users` table; bootstrap screen and registration state.
- Error: invalid registration, role assignment rejection, ID token refresh failure.
- Permission denied: admin-only action attempted by non-admin; render a clear restriction card rather than a blank panel.

### Dependencies

- Requires Phase 0 for consistent money model and database assumptions; does not depend on seeded demo content.
- Must precede Phase 2 because seeded accounts must be created with correct roles.

### Acceptance criteria

- Unauthenticated visitors are blocked from the app shell and can only see the auth screen.
- The first registration creates an admin claim server-side.
- Subsequent self-service registration creates a `parent` claim server-side.
- Admin-only `setUserRole` no longer depends on Firebase Cloud Functions.
- `functions/` is removed from the repository tree.
- After an admin changes a user’s role, the client refreshes ID tokens and sees the new claim without waiting for expiry.

### Verification steps

- `npm run build`
- Manual browser check in the app shell: unauthenticated visitor cannot see dashboard and is redirected to sign-in/register.
- Direct API check to `POST /api/users/role` with admin token returns 200 and token refresh path updates role state.
- Role denial check via a non-admin token returns 403.

### Risks

- Role claims not refreshed on client, leaving stale `role` state after an update.
- Mismatch between Postgres `users` table and Firebase custom claims if registration or claim assignment is not atomic.
- A race condition when the first user registers on a fresh empty database.

### Estimated size

- Large. It touches auth state, bootstrap logic, server routes, and user-flow UX across the app shell.

## Phase 2 — Seed data

### Objective
Create an idempotent, realistic academy dataset that proves the product is role-isolated and usable by a real person in a demo environment.

### Files created, modified, and deleted

- Modified: `prisma/schema.prisma` only if a seed or helper enum is needed; otherwise no schema change is required.
- New: `prisma/seed.ts`.
- New: optional helper under `scripts/` or `lib/` for idempotent seed generation, if the chosen implementation requires a small helper; no current script file exists.
- Modified: `package.json` to expose a seed command such as `prisma db seed` or a custom `npm run db:seed`, if the repo does not already have a seed script.
- No domain code is deleted or restructured in this phase.

### Schema and migration impact

- No destructive migration. This is a data-only phase.
- Seed must produce: 3 coaches, 6 families, 12 athletes across 4 sports, 3 months of assessment history, invoices spread across paid / pending / overdue statuses, and two weeks of scheduled sessions including one deliberate conflict.
- All amounts must respect the Decimal money model from Phase 0.

### API surface

- No new route required for seed execution; this is a repo-side data seeding task.
- The seed must create or reconcile demo users in the target environment and ensure Firebase Auth users for the three demo accounts exist and have custom claims matching their Postgres rows.
- Error cases: duplicate seed run should not create duplicates; role mismatches should fail loud and be visible in logs.

### Role behaviour matrix

- Admin: sees full billing, schedule, and athlete data.
- Coach: sees only coach-facing schedule / assessment surfaces and cannot access parent billing.
- Parent: sees only their family’s athletes, associated assessment history, and family invoice records.
- Verification of role isolation is done by reading the same dataset under each seeded account.

### UI states

- Loading: while seed or auth rows are being hydrated.
- Empty: if a demo user has no child or invoice records, the admin should see a meaningful empty state but not a crash.
- Error: if claim mismatch or seed re-run fails, the app should surface a friendly error state in the target environment.

### Dependencies

- Requires Phase 0 for Decimal correctness and Phase 1 for auth bootstrap and server-side role setting.
- Must be complete before Phase 3 because the role-visibility work is easier to prove against a real seeded dataset.

### Acceptance criteria

- Running the seed repeatedly is idempotent and leaves the same data shape.
- Three seeded accounts exist in the demo environment: one admin, one coach, one parent.
- The demo dataset includes 12 athletes across 4 sports and 3 months of assessment history.
- The schedule data includes an intentionally conflicting booking to demonstrate the conflict engine in Phase 5.
- All seeded invoice amounts and installment sums are valid under the Decimal model.

### Verification steps

- `npx prisma db push` or Prisma migration + seed execution in the target demo environment.
- `node prisma/seed.ts` or the project’s chosen seed command.
- Manual log inspection for seeded user count, athlete count, invoice statuses, and schedule conflict creation.
- Browser login as each seeded account and confirm account-specific pages.

### Risks

- Seeding creates conflicting IDs or duplicate user rows across Postgres and Firebase Auth.
- Demo data not reflective of actual Gulf sports academy operations if the names, fees, and session patterns are implausible.
- Seed run without idempotency creates inconsistent state across repeated demo setup.

### Estimated size

- Medium. It is data-heavy but not architecturally complex; the challenge is realistic domain consistency rather than backend complexity.

## Phase 3 — Role boundaries made visible

### Objective
Remove any billing access or ownership bypass that would allow coach or arbitrary parent access to the wrong family’s data and make the app genuinely different depending on the user’s role.

### Files created, modified, and deleted

- Modified: `[lib/auth/requireOwnership.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/lib/auth/requireOwnership.ts)` to remove the coach early return for `invoice` resources.
- Modified: `[app/api/invoices/route.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/app/api/invoices/route.ts)` to forbid coach reads and enforce admin-only invoice listing.
- Modified: `[components/Navbar.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/components/Navbar.tsx)` and any other top-level role-gating components to hide or disable billing-focused features from coach and parent roles differently.
- Modified: `[components/billing/BillingSection.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/components/billing/BillingSection.tsx)` to show a “restricted to administrators” state instead of blank / broken / errorful behavior.
- Potentially modified: `[app/page.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/app/page.tsx)` if the dashboard tabs or role-based content is still not materially different across roles.
- No files deleted in this phase.

### Schema and migration impact

- No schema changes required; this is authorization policy work, not a DB model change.
- The application-level invariant remains that invoice ownership is anchored on `parentUserId` and not on email or a client-controlled document.

### API surface

- `GET /api/invoices` must require `['admin']` for all invoice list reads. Coach is denied with 403.
- `GET /api/invoices/[id]` must respect `requireOwnership` for parent-owned invoice access and deny coach unless explicitly permitted by other admin-only rules.
- Error cases: 401 on invalid token, 403 on missing admin/ownership, 404 on unknown invoice, 500 on database failure.

### Role behaviour matrix

- Admin: sees all billing data and can issue/approve ledger changes.
- Coach: sees a clear permission-denied state if they navigate to billing; there is no silent empty state and no unauthorized data.
- Parent: sees only their own invoice records; if requested invoiceId does not belong to them, the server denies access.

### UI states

- Loading: invoice list fetch while auth and ownership are being resolved.
- Empty: no invoices for a valid parent or no families for admin.
- Error: server-side failure; show a visible error card.
- Permission denied: coach sees an explicit “restricted to administrators” card and cannot misread it as a blank panel.

### Dependencies

- Must follow Phase 1 for auth and Phase 2 for seeded data. Without seeded users and claims, the role behavior cannot be demonstrated.

### Acceptance criteria

- `GET /api/invoices` with a coach token returns 403.
- `requireOwnership` no longer early-returns for `coach` on the `invoice` resource.
- A coach user can navigate to the billing section and sees a permission-denied state rather than an empty or broken UI.
- Parent users cannot request another family’s invoice by `invoiceId`.

### Verification steps

- Run route-level security tests for invoice reads.
- Manual login with the seeded admin, coach, and parent accounts and verify each role sees a different billing experience.
- Confirm API calls from coach return 403 with no invoice data.

### Risks

- UI screens may still unintentionally call admin billing endpoints for coach users if data fetch code is not filtered.
- Parent ownership checks may be bypassed if client-side filters allow `invoiceId` guessing without server enforcement.

### Estimated size

- Medium. Most risk is in cross-role UX correctness, not schema complexity.

## Phase 4 — Remove every fake

### Objective
Delete every fake or placeholder data path and make the app’s identity and server behavior honest, especially for dashboard counters, AI fallback text, and Firebase role fallback logic.

### Files created, modified, and deleted

- Modified: `[app/page.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/app/page.tsx)` to remove localStorage fallbacks and use real server-backed data.
- Modified: `[app/api/gemini/route.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/app/api/gemini/route.ts)` to remove the simulated hardcoded paragraph and return a 500 or a real AI response without fabricating advice.
- Modified: `[lib/authContext.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/lib/authContext.tsx)` to remove the Firestore fallback `role` path entirely.
- Deleted: `[firestore.rules](/home/sc/AcademyHub.worktrees/pasted-text-processing/firestore.rules)` if the project fully migrates to Postgres-only role enforcement; if not, leave depopulated and clearly remove deployment use.
- Modified: `package.json` and environment config to remove Stripe if the project still includes it.
- Deleted: Stripe route artifacts under `app/api/stripe/` and related references in UI code such as `[components/billing/BillingSection.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/components/billing/BillingSection.tsx)`.

### Schema and migration impact

- No new schema required.
- The brief explicitly removes Stripe from scope; the implementation should delete environment variables and routes rather than leave dormant dead code.

### API surface

- `POST /api/gemini` returns 500 or a real response when the API key is absent; it does not silently invent advice.
- Stripe routes are removed.
- Authentication routes do not accept client-side role assignment or data fallback from Firestore.

### Role behaviour matrix

- Admin: dashboards, billing, and AI features use real server data.
- Coach: no access to fake analytics or billing surfaces that are not real.
- Parent: sees real athlete and payment data only, not fabricated numbers or invented fake assessments.

### UI states

- Loading: data fetch state.
- Empty: no data in database for that role.
- Error: any real data-fetch failure or missing env value should be shown honestly.
- Permission denied: same as Phase 3.

### Dependencies

- Requires Phase 3 role visibility and the seeded dataset to confirm the app’s data is genuine.

### Acceptance criteria

- `app/page.tsx` no longer falls back to `4` athletes and `3` sessions.
- `app/api/gemini/route.ts` no longer returns invented content when `GEMINI_API_KEY` is missing.
- `lib/authContext.tsx` no longer reads from Firestore for role assignment.
- Stripe is removed from dependencies, routes, and environment documentation.

### Verification steps

- Search the repo for `STRIPE_` and `localStorage.getItem('academyhub_')` to confirm no fake data remains.
- Manual app check for a real loaded state with no fallback numbers.
- Manual API call to `/api/gemini` with no key returns a 500/real error path, not a simulated paragraph.

### Risks

- Removing fake data too early can leave the app with empty states that are hard to understand.
- A client may still render stale state if the auth refresh path is not handled properly.

### Estimated size

- Medium. More of a correctness sweep than an architectural change.

## Phase 5 — Real scheduling

### Objective
Move the scheduling feature from client-only local storage to a real Postgres-backed `/api/schedules` route with server-side conflict detection.

### Files created, modified, and deleted

- Modified: `[components/scheduling/SchedulingSection.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/components/scheduling/SchedulingSection.tsx)` to stop reading/writing `localStorage` and instead use `/api/schedules`.
- New: `app/api/schedules/route.ts` (or equivalent actual route file consistent with the repo pattern) with CRUD methods.
- Modified: any schedule service/helper code if exists; the repo currently has no server schedule API, so the implementation will add it in a minimal form.
- Potentially modified: `[prisma/schema.prisma](/home/sc/AcademyHub.worktrees/pasted-text-processing/prisma/schema.prisma)` only if the schedule table is not yet aligned to the target domain model.

### Schema and migration impact

- If the `Schedule` model is present but not fully used, it may require a migration for fields like `coachId`, `facility`, `date`, `timeSlot`, and `maxCapacity` to be fully aligned with the API contract.
- The conflict engine must validate on both coach and facility for overlapping slots and should be implemented server-side, not in-browser.

### API surface

- `GET /api/schedules`: list sessions for the authenticated user context.
- `POST /api/schedules`: create a new session with server-side overlap validation.
- `PATCH /api/schedules/[id]`: update scheduling record if authorized.
- `DELETE /api/schedules/[id]`: remove schedule record if authorized.
- Request shape includes `title`, `facility`, `coachId`, `sport`, `date`, `timeSlot`, `maxCapacity`, etc.
- Response shapes include created/updated schedule objects and conflict errors.
- Error cases: 400 invalid payload, 403 forbidden role, 409 conflict detected on coach or facility, 500 DB failure.

### Role behaviour matrix

- Admin: full scheduling management.
- Coach: can create/manage their own bookings; cannot override another coach’s facility or overlapping booking.
- Parent: no schedule write capability; read-only or no access depending on final UX policy.

### UI states

- Loading: fetch or create state.
- Empty: no scheduled sessions yet.
- Error: conflict or validation error.
- Permission denied: if a user lacks the route permission, show explicit message.

### Dependencies

- Requires completion of Phase 2 seed data to include a deliberate conflict and real schedule rows.

### Acceptance criteria

- A session cannot be created if it overlaps with an existing booking on the same facility or same coach.
- The conflict engine runs on the server, so two browsers cannot double-book the same coach/facility through separate requests.
- `components/scheduling/SchedulingSection.tsx` no longer uses `localStorage` for scheduling state.

### Verification steps

- Route-level tests with deliberate facility and coach overlap.
- Manual browser scenario where two clients attempt the same booking simultaneously; the second request fails with `409 Conflict`.

### Risks

- Time-slot comparisons can fail if the app logic uses naive string comparisons instead of date/time normalization.
- Cross-timezone / QAR schedule assumptions may not match the Sunday–Thursday week requirement.

### Estimated size

- Large. It combines data integrity, server validation, and real multi-user coordination.

## Phase 6 — Manual payment ledger

### Objective
Replace Stripe with a manual payment ledger where an admin records a payment method and reference, while the parent sees the updated status on the next data refresh.

### Files created, modified, and deleted

- Modified: `[components/billing/BillingSection.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/components/billing/BillingSection.tsx)` to remove Stripe checkout and replace it with manual payment recording controls.
- Modified: `[app/api/invoices/route.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/app/api/invoices/route.ts)` and `[app/api/invoices/[id]/route.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/app/api/invoices/[id]/route.ts)` to support payment ledger updates.
- Deleted: `app/api/stripe/create-checkout-session/route.ts` and `app/api/stripe/webhook/route.ts` in the target implementation.
- Potentially modified: `types/billing.ts` and any service helper that currently prepares Stripe Checkout payloads.

### Schema and migration impact

- No new schema required, but the ledger logic must enforce the invariant: installment amounts sum to `Invoice.netTotal`.
- The payment ledger should record payment method and reference as metadata on the invoice or installment row, whichever the chosen domain model requires.

### API surface

- `PATCH /api/invoices/[id]` or equivalent route for admin payment status updates.
- Payload includes payment status and internal ledger metadata, such as `method` and `reference`.
- Parent read path returns the latest status to the client on the next poll / refresh.
- Error cases: 400 for invalid invoice status, 403 for unauthorized user, 404 for unknown invoice, 500 for DB update failure.

### Role behaviour matrix

- Admin: records payment method + reference and marks invoice or installment paid.
- Coach: not allowed to update billing or ledger.
- Parent: sees updates after the next poll; cannot modify payment status.

### UI states

- Loading: pending update request.
- Empty: no ledger transactions available.
- Error: invalid payment update or network error.
- Permission denied: route-level denial for non-admin users.

### Dependencies

- Requires Phase 5 and Role 3 because the payment ledger is a role-guarded admin action and must not be visible to unauthorized users.

### Acceptance criteria

- An admin can mark an invoice or installment as paid using a manual method and reference.
- Parent UI reflects the payment change after refresh.
- The system enforces the invariant that `sum(installments.amount) === invoice.netTotal` before finalizing status.

### Verification steps

- Use a seeded invoice and run a ledger update from the admin account.
- Confirm the invoice status is updated and the parent account sees the change after polling.
- Validate that a payment update with mismatched or unbalanced installments fails at the server.

### Risks

- Payment ledger updates may be implemented client-side with no server validation if the route is not enforced.
- Invariant checks may be incomplete if installment sum is calculated on one path but not another.

### Estimated size

- Medium. It is manageable but touches both billing and data integrity contracts.

## Phase 7 — Admin analytics

### Objective
Provide revenue, athlete, and coach-fill analytics from real Postgres aggregate queries with no fake or hardcoded chart values.

### Files created, modified, and deleted

- Modified: `[components/Navbar.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/components/Navbar.tsx)`, `[app/page.tsx](/home/sc/AcademyHub.worktrees/pasted-text-processing/app/page.tsx)`, and any existing analytics surfaces already present in the repo if they are part of the dashboard.
- Potentially modified: `prisma/schema.prisma` only if the existing `CoachProfile` model is relevant; the plan must either use it or justify a replacement.
- No file deletion is required.

### Schema and migration impact

- `CoachProfile` is touched only if it is kept as an admin analytics surface; otherwise it should be removed or left unused with a clear justification in the implementation.
- No major migration unless the analytics stage requires additional fields not currently in the schema.

### API surface

- New aggregate endpoints or dashboard-level queries may be added to fetch revenue, athlete counts, and overdue data.
- Response shapes should be simple aggregated objects (e.g. `revenueCollected`, `outstandingBalance`, `athletesPerSport`, `coachFillRate`, `overdueCount`).
- Error cases: 401 invalid auth, 403 non-admin, 500 DB aggregation failure.

### Role behaviour matrix

- Admin: sees all analytics and controls the dashboard overview.
- Coach: can see their own staffing / fill metrics only if the route is explicitly designed for them; otherwise the analytics panel is hidden.
- Parent: sees no admin analytics; the parent view should not expose aggregate billing or coach utilization metrics.

### UI states

- Loading: waiting for aggregate query results.
- Empty: no revenue / no athletes / no schedules.
- Error: analytics query failure.
- Permission denied: explicit message when non-admin access is attempted.

### Dependencies

- Requires real seeded data and a valid payment ledger in Phase 6.

### Acceptance criteria

- Admin analytics are calculated from actual Prisma aggregate queries over the live database.
- Repeated aggregated values are stable and reflect seeded dataset totals.
- No hardcoded numbers remain in the admin dashboard summary cards.

### Verification steps

- Run representative aggregate queries against the seeded Postgres database.
- Compare totals in the UI against database rollups.
- Manual browser check as admin, coach, and parent account.

### Risks

- Aggregate queries can be misleading if they mix stale data or duplicates from denormalized tables.
- Analytics based on Firestore or in-browser state will make the demo impossible to trust.

### Estimated size

- Medium. It is data-heavy but follows existing patterns and should be straightforward once the data model is stable.

## Phase 8 — Honest AI feature

### Objective
Deliver a parent-facing progress narrative generated from real stored assessment history without inventing measurements or fake confidence scores.

### Files created, modified, and deleted

- Modified: `[app/api/gemini/route.ts](/home/sc/AcademyHub.worktrees/pasted-text-processing/app/api/gemini/route.ts)` and any AI summary surfaces used by the parent flow.
- Potentially modified: the parent-facing UI on the main page or athlete profile view to show the summary in a clear and honest format.
- No deletion beyond removing the fake fallback paragraph is required.

### Schema and migration impact

- No new schema required if assessment history is already stored as `Assessment` records with `quantitativeMetrics`, `qualitativeObservations`, and `computedScore`.
- This phase is operational: transform stored assessment history into a textual summary without inventing new fields.

### API surface

- `POST /api/gemini` or a narrower parent-scope route can take an athlete ID and return a narrative string summarizing improvement trends, plateaus, or recurring fault patterns.
- Request shape: `{ athleteId: string, athleteName?: string, sport?: string }`.
- Response shape: `{ summary: string }` or a simple JSON payload with safe narrative text.
- Error cases: 401 invalid auth, 403 unauthorized access, 404 athlete not found, 500 failed generation or missing assessment history.

### Role behaviour matrix

- Admin: can review parent-facing summary output when an athlete record is accessed.
- Coach: may see the summary if they are acting on the athlete context, but not broader hidden strings or unrelated family data.
- Parent: receives a summary of their own child’s real progress based on actual assessments.

### UI states

- Loading: summary generation in progress.
- Empty: no assessment history yet, show “No history to summarize.”
- Error: no assessment data or generation failure.
- Permission denied: if the athlete does not belong to the user.

### Dependencies

- Requires seeded assessment history in Phase 2 and real API-safe data flow from Phase 4.

### Acceptance criteria

- Parent summary text is based only on stored assessment history.
- No invented measurements, confidence scores, or biological claims are generated.
- If there is no assessment data, the app shows a clear empty message rather than a fabricated score.

### Verification steps

- Run the summary generation against a seeded athlete with three months of assessment data.
- Confirm the generated narrative references real athlete history and does not invent numbers or unsupported confidence claims.
- Manual browser check for parent account and no-assessment case.

### Risks

- AI output can drift into invented claims if the prompt is not tightly constrained to the real stored data.
- Parent and coach access must be strictly limited to their own athlete data to prevent leakage.

### Estimated size

- Small to medium. It is a narrow product feature, but it must rely on real stored data and permission checks.

## Final execution notes

- This plan intentionally treats the codebase as a real system under development rather than a generic SaaS template. The repo’s current state is close to a fully role-based demo with multiple broken edges that need to be fixed in a strict order.
- No application code, schema, or configuration file is modified by this planning task. The only repository change is the new plan document itself.
- The implementation order is strict; the brief’s sequence is preserved exactly, and the phases are not rearranged. The plan follows the documented sequence even where the repo would otherwise make it tempting to optimize by patching auth and UI simultaneously.
