# TASK
Phase 3.2 — Two parts. First, fix a structural gap affecting every domain built so far: no Postgres `users` row is ever created for a real signed-in Firebase user, which will cause any write requiring a `parentUserId` foreign key to fail. Second, cut athletes over from two independent, already-inconsistent hardcoded lists to real Postgres-backed CRUD, following the Phase 3.1 pattern.

# ROLE
You are a senior full-stack Next.js/Prisma engineer working inside the AcademyHub repository.

# CONTEXT
Phase 3.1 cut invoices over to Postgres and was live-verified against a real database. During Phase 3.2 planning, two things were found:

1. **No code anywhere creates or upserts a `users` row in Postgres.** `prisma.user.create`/`prisma.user.upsert` appears nowhere in the codebase. `lib/auth/verifyRequestAuth.ts` decodes the Firebase token and returns the UID/claims, but nothing persists a matching `User` row. Every FK-constrained write (invoice creation, and now athlete creation) will fail for a real user with a `foreign key constraint violation` the first time it's actually exercised outside a hand-seeded test. Phase 3.1's live-database proof didn't catch this because it manually inserted `users` rows via raw SQL rather than going through the app's real auth flow.
2. **Athletes currently have no backend at all**, not even Firestore. `components/profiles/AthleteProfileSection.tsx` hardcodes a 4-athlete `ATHLETES_REGISTRY` array and persists "new" registrations to browser `localStorage` only — nothing is shared across devices or users. Separately, `components/biomechanics/RapidAssessmentForm.tsx` hardcodes its own, *different*, already-inconsistent 5-athlete list (`DEFAULT_ATHLETES`) for the assessment-submission athlete picker — note it includes `ath_8046` (Liam Chen), who doesn't exist in the other list. These two sources of truth have already drifted apart.

This is pre-launch — no real data to preserve or migrate in either the user-sync fix or the athlete cutover.

# OBJECTIVE
1. A `users` row is reliably created/updated in Postgres for any authenticated caller, before any code path that would otherwise hit a foreign-key constraint on `parentUserId`.
2. Athletes are read and written exclusively through Postgres via Prisma, behind authenticated, ownership-checked API routes, with a single source of truth replacing both hardcoded lists.

# PART 1 — USER PROVISIONING FIX

## Problem
`Invoice.parentUserId` and `Athlete.parentUserId` are both non-nullable foreign keys to `User.id`. Nothing populates `User` rows. The first real (non-test-seeded) write to either table will fail.

## Required change
Add a function, e.g. `lib/auth/ensureUserRecord.ts`, that takes the `AuthUser` returned by `verifyRequestAuth` and does `prisma.user.upsert()`:
- `where: { id: user.uid }`
- `update:` refresh `email` (and `role` if present in claims — see note below) in case they changed
- `create:` `{ id: user.uid, email: user.email, role: <mapped from claims, defaulting sensibly if absent> }`

**Role mapping note:** `requireRole`/`requireOwnership` must continue to source role *exclusively* from Firebase custom claims for authorization decisions — this upsert only mirrors that claim into Postgres for FK/display purposes, it must never become a second source of truth that authorization logic reads from. Do not change `requireRole`/`requireOwnership` to read role from the `User` table. If a caller has no role claim at all (shouldn't happen given `functions/setUserRole.ts`, but be defensive), pick a safe default for the Postgres mirror and note your choice in the report — don't let an upsert failure block an otherwise-valid request if it's avoidable, but don't silently swallow a real error either.

Call `ensureUserRecord` in:
- `POST /api/invoices` (Phase 3.1) — before the FK-dependent `createInvoiceAdmin` call, for whichever user ends up as `parentUserId` (note: currently this can be either `body.parentUserId` or `user.uid` — if it's a different target parent than the caller, you need that target parent's row to exist too, not just the caller's; think through this case and report how you handled it).
- The new athlete creation route (Part 2 below).
- Any other write route you identify that has the same FK dependency — check `installments`/`invoice_children` creation paths too if they're touched by invoice creation logic.

Do not call it on every GET request — only where a write is about to depend on the FK existing. Unnecessary upserts on every read add cost and aren't needed since reads don't hit the FK constraint.

# PART 2 — ATHLETES CUTOVER

## Relevant files to inspect first
- `prisma/schema.prisma` — `Athlete`, `AthleteSport` models. Already correctly shaped (Phase 0). Do not modify.
- `firestore.rules` — the athletes rule is `allow read: if isCoach() || isParentOf(...)`, `allow write: if isCoach()`. **Athlete write is coach-gated, not admin-only** — different from invoices' `admin`-only pattern from Phase 3.1. Get this right; do not copy the invoice role gate by reflex.
- `components/profiles/AthleteProfileSection.tsx` — full file. `ATHLETES_REGISTRY`, `localStorage` persistence, `handleRegisterAthlete`, and how `activeAthlete`/`athletesList` are consumed by the rest of the component (assessment display, sport filtering, etc.) — preserve behavior for the consuming UI as much as possible.
- `components/biomechanics/RapidAssessmentForm.tsx` — full file. `RapidAthlete` interface, `DEFAULT_ATHLETES`, `selectedAthlete` lookup, and how it's passed into `evaluateAssessment`/`evaluationService`.
- `components/biomechanics/BiomechanicsSection.tsx` — around line 259, how it renders `RapidAssessmentForm` and whether it passes an athlete list as a prop or the form sources its own.
- `app/api/invoices/route.ts` and `services/billingAdminService.ts` (Phase 3.1) — the pattern to replicate: route structure, auth-check-first ordering, Prisma query shape, `requireOwnership` usage.
- `lib/auth/requireOwnership.ts` — already supports `'athlete'` as a resource type (built in Phase 1, unused until now). Use it as-is.

## Desired behavior
1. **New API routes** under `app/api/athletes/`:
   - `GET /api/athletes` — list. `parent` sees only their own (query-level `where: { parentUserId: user.uid }`, same pattern as invoices). `coach`/`admin` see all.
   - `GET /api/athletes/[id]` — single athlete. `requireOwnership(user, 'athlete', id)`.
   - `POST /api/athletes` — create. **`coach` or `admin` only**, per the original Firestore rule. Call `ensureUserRecord` first for the target parent (an admin/coach registering an athlete on behalf of a parent who may be signing up for the first time — the parent's Firebase UID must be known/provided somehow; if the current UI doesn't collect a parent's UID anywhere, only their email, report this as a real gap rather than inventing a lookup-by-email mechanism that doesn't exist yet — this may mean athlete creation in this phase requires the parent to already have signed in at least once so their UID is resolvable, and that limitation should be stated plainly, not hidden).
2. **`components/profiles/AthleteProfileSection.tsx` rewritten** to fetch from `GET /api/athletes` instead of `ATHLETES_REGISTRY`/`localStorage`. Poll on the same interval pattern as Phase 3.1's invoice hook (consider factoring a shared polling hook if it's a clean, minimal extraction — but don't force a refactor if it adds risk; a second small `useAthletesSubscription.ts` following the exact same shape as `useInvoicesSubscription.ts` is an acceptable, safer default). `handleRegisterAthlete` now calls `POST /api/athletes` instead of writing to `localStorage`.
3. **`components/biomechanics/RapidAssessmentForm.tsx`'s `DEFAULT_ATHLETES` replaced** with the same real athlete data source — no second hardcoded list. Decide whether it fetches independently or receives the list via props from `BiomechanicsSection.tsx` (check how `BiomechanicsSection.tsx` currently obtains athlete data, if at all, before deciding) — report your choice and why.
4. **No fallback to hardcoded data** on error, in either component — same discipline as Phase 3.1's invoice empty-vs-error fix. An empty athlete list is a valid, distinct state from a permission/auth error.

# ARCHITECTURAL CONSTRAINTS
- Do not modify `lib/auth/requireRole.ts`, `lib/auth/requireOwnership.ts`'s core logic, or `prisma/schema.prisma`.
- Do not touch invoices' route logic beyond adding the `ensureUserRecord` call where identified.
- Do not touch assessments/`app/api/biomechanics/evaluate/route.ts` beyond what's unavoidable to wire the real athlete list into `RapidAssessmentForm.tsx` — assessment persistence itself is Phase 3.3, out of scope here.
- Do not invent a parent-lookup-by-email mechanism if one doesn't already exist — report the gap instead of building around it silently.

# SECURITY REQUIREMENTS
- Parent-scoped athlete queries filter at the database level, not application-level post-filtering — same requirement as Phase 3.1.
- `ensureUserRecord`'s upsert must never let role information flow backward into an authorization decision — it's a one-way mirror for FK integrity only.
- Coach/admin role check on athlete creation must actually verify against Firebase custom claims via `requireRole`, not any other signal.

# UX REQUIREMENTS
Same empty-vs-error distinction requirement as Phase 3.1. Preserve `AthleteProfileSection.tsx`'s existing sport-filtering and analytics view behavior as much as possible — this phase changes the data source, not the UI's feature set.

# DATA REQUIREMENTS
`DATABASE_URL` points at the same live local Postgres instance used in Phase 3.1. Use real integration-style tests where they meaningfully prove FK/ownership behavior (as Phase 3.1 did, informed by the manual proof you ran together), mocked-Prisma unit tests elsewhere — same judgment call as Phase 3.1, justify per test.

# IMPLEMENTATION GUIDANCE
1. Read every file listed above in full first.
2. Build `ensureUserRecord` and wire it into the identified write paths first — this is small and foundational.
3. Build the athlete routes.
4. Rewrite `AthleteProfileSection.tsx`.
5. Rewrite `RapidAssessmentForm.tsx`'s athlete source.

# DO NOT DO
- Do not modify `prisma/schema.prisma`, `lib/auth/requireRole.ts`, or `requireOwnership.ts`'s logic.
- Do not touch assessment persistence/Phase 3.3 territory.
- Do not invent a parent-lookup-by-email mechanism.
- Do not let the `ensureUserRecord` upsert become a role-authorization source.
- Do not leave any hardcoded athlete fallback data reachable, in either component.
- Do not commit without running the four verification commands first, and do not leave work uncommitted — commit and push yourself, as in Phase 3.1.
- Do not silently omit any required report section.

# ACCEPTANCE CRITERIA
- `ensureUserRecord` exists, is called at the identified write points, and does not affect authorization logic.
- Both hardcoded athlete lists (`ATHLETES_REGISTRY`, `DEFAULT_ATHLETES`) are gone, not just unused.
- New athlete routes exist with correct `coach`/`admin` write gating and `requireOwnership` on single-resource reads.
- `git diff --stat` against current `origin/main` HEAD is confined to: `lib/auth/ensureUserRecord.ts` (new), `app/api/invoices/route.ts` (the one added call), `app/api/athletes/**` (new), `components/profiles/AthleteProfileSection.tsx`, `components/biomechanics/RapidAssessmentForm.tsx`, possibly `components/biomechanics/BiomechanicsSection.tsx` if genuinely needed, a new `hooks/useAthletesSubscription.ts` if you go that route, and test files.
- `npx tsc --noEmit`, `npx next build`, `npx vitest run` all pass, including all 40 existing tests.

# TESTING / VERIFICATION
Run and report, in order:
1. `npx vitest run` — full suite, every test name and pass/fail status.
2. `npx tsc --noEmit`
3. `npx next build`
4. `git diff --stat` against current `origin/main` HEAD — state the base commit hash.
5. Commit and push yourself; `git log origin/main --oneline -3` after, to prove it landed.

# FINAL REPORT — REQUIRED FORMAT, all sections mandatory
1. **Files created/modified**, one-line description each.
2. **Full test list** — every test name and pass/fail status.
3. **How `ensureUserRecord` handles the "creating an athlete/invoice for a different parent than the caller" case** — explain the resolution.
4. **The parent-lookup gap**, if you hit it as predicted — describe exactly what's missing and what Phase 4 (signup flow) will need to close it.
5. **Confirmation**: "Both hardcoded athlete lists have been fully deleted, not just made unreachable."
6. **Confirmation**: "Role authorization continues to source exclusively from Firebase custom claims; `ensureUserRecord` does not feed into `requireRole`/`requireOwnership`."
7. **Full output** of all five verification commands, including the post-push `git log`.
8. **One paragraph** on what Phase 3.3 (assessments) needs to replicate, including whether assessments should now validate `athlete_id` against the real `Athlete` table via a real FK, given athletes are real records now.
