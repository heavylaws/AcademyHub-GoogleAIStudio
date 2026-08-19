# TASK
Phase 3.3 — Cut assessments over from Firestore to Postgres. This is the last domain in the Firestore-to-Postgres migration. It requires one thing every prior phase was explicitly barred from doing: extending `lib/auth/requireOwnership.ts` to support `'assessment'` as a resource type. This was deliberately deferred back in Phase 1 with the note "designed explicitly, not folded in silently" — this is that design work, now that real `Athlete` records with real `parentUserId` exist to join through.

# ROLE
You are a senior full-stack Next.js/Prisma engineer working inside the AcademyHub repository.

# CONTEXT
Phase 3.1 cut over invoices, Phase 3.2 cut over athletes and fixed the missing Postgres user-provisioning gap (`ensureUserRecord`). Assessments are the last piece still on Firestore. Unlike invoices/athletes, `Assessment` has no `parentUserId` column — ownership for a parent viewing their child's assessment must be resolved by joining through `Assessment.athleteId → Athlete.parentUserId`. This is exactly the more error-prone, different-shaped check flagged back in Phase 1 as needing explicit design rather than being folded into the original three-function API silently.

Current state:
- `app/api/biomechanics/evaluate/route.ts` (Phase 2, already auth-gated `coach`/`admin`) computes an assessment's score — deterministic or AI-assisted — and returns it. It does not persist anything.
- Persistence happens separately, client-side: `components/biomechanics/RapidAssessmentForm.tsx` calls `saveAssessmentToFirestore` (in `lib/assessmentConverters.ts`) directly from the browser after `evaluate` returns, writing straight to Firestore with no server-side check beyond Firestore's own rules (`allow write: if isCoach()`).
- `hooks/useAssessmentsSubscription.ts` has the same bug already fixed twice now in invoices and athletes: `onSnapshot` subscription with a `BASELINE_ASSESSMENTS` fallback that fires on both a genuinely empty result *and* a permission-denied error, making them indistinguishable. This hook is consumed by `components/profiles/AthleteProfileSection.tsx`, `components/biomechanics/LiveAssessmentDashboard.tsx`, and `components/biomechanics/BiomechanicsSection.tsx` — check all three for how they use its shape.
- The original Firestore rule for assessment read access: `allow read: if isCoach() || isParentOf(resource.data.parent_email)`. Write: `allow write: if isCoach()`.
- Score-computation helpers (`calculateComputedScore`, `deriveRubricGrade`) live in `types/assessment.ts`, not `lib/assessmentConverters.ts` — they are not Firestore-coupled and should be reused as-is.

This is pre-launch — no real assessment data to migrate.

# OBJECTIVE
1. `requireOwnership` supports `'assessment'` via a join through `Athlete.parentUserId`, explicitly designed and tested, not bolted on.
2. Assessments are created and read exclusively through authenticated, ownership-checked Postgres-backed API routes.
3. `athlete_id` on assessment creation is validated against the real `Athlete` table — reject if it doesn't exist, rather than accepting an arbitrary client-provided string as the old Firestore path did.
4. The fake-data fallback (`BASELINE_ASSESSMENTS`) is gone, and empty vs. error states are genuinely distinguishable, same as invoices and athletes.

# PART 1 — EXTEND `requireOwnership` FOR ASSESSMENTS

## Required change
In `lib/auth/requireOwnership.ts`, add `'assessment'` handling: resolve ownership by looking up the assessment's `athleteId`, then that athlete's `parentUserId`, then compare to `user.uid` — same fail-closed behavior as the existing athlete/invoice branches (not found → deny, database error → deny, coach/admin → bypass as before).

Also add `'assessment'` to the `ResourceType` union in `lib/auth/types.ts`.

## Required tests
Add to `lib/auth/auth.test.ts` (or a clearly-named adjacent file if you prefer, your call, justify it): owner-via-join succeeds, non-owner-via-join rejected, coach/admin bypass still works for assessments, assessment not found fails closed, database error during the join fails closed. Mirror the existing athlete/invoice test structure exactly — this is a deliberate extension of an already-reviewed pattern, not new design space.

This is the one phase where modifying `lib/auth/` is explicitly permitted and required. Do not use this as license to touch `requireRole.ts` or `verifyRequestAuth.ts` — only `requireOwnership.ts` and `types.ts`'s `ResourceType`.

# PART 2 — ASSESSMENT PERSISTENCE AND ROUTES

## Desired behavior
1. **New API routes** under `app/api/assessments/`, following the exact pattern established in `app/api/invoices/` and `app/api/athletes/`:
   - `GET /api/assessments` — list. `parent` sees only assessments for athletes they own (join-filtered at the query level: `where: { athlete: { parentUserId: user.uid } }` in Prisma, not fetch-all-then-filter). `coach`/`admin` see all.
   - `GET /api/assessments/[id]` — single. `requireOwnership(user, 'assessment', id)`.
   - `POST /api/assessments` — create. `coach`/`admin` only, matching the Firestore rule. Must validate `athleteId` exists in the `Athlete` table before creating — return a clear 400 if not, don't let it fail as an opaque FK constraint error. Call `ensureUserRecord` for the authenticated coach before the write (coach is a nullable FK on `Assessment` but should still be provisioned for consistency with the invoice/athlete pattern).
2. **Decide and justify**: does `POST /api/assessments` absorb the scoring computation currently done in `/api/biomechanics/evaluate`, or do the two stay separate (evaluate computes, a client then calls `POST /api/assessments` to persist the result)? Default recommendation: **keep them separate** — lower risk, matches the established one-route-per-concern pattern from invoices/athletes, and doesn't require touching `/api/biomechanics/evaluate`'s existing Phase 2 auth wiring and tests. Only combine them if you find a concrete reason the split is broken or unsafe, and state that reason explicitly in your report rather than merging by default.
3. **`hooks/useAssessmentsSubscription.ts` rewritten** to poll the new `GET /api/assessments` route, same 10–15s interval pattern as `useInvoicesSubscription.ts`/`useAthletesSubscription.ts`. `BASELINE_ASSESSMENTS` and all fallback logic deleted entirely, not made unreachable. Empty result and auth/permission error must be genuinely distinguishable in the returned state, same as the prior two phases.
4. **`components/biomechanics/RapidAssessmentForm.tsx`'s `handleSubmit`** calls the new persistence route instead of `saveAssessmentToFirestore`, attaching the bearer token the same way Phase 2.5 wired the other calls in this same file.
5. **`lib/assessmentConverters.ts`'s Firestore-specific functions** (`saveAssessmentToFirestore`, `getAssessmentsByAthlete`, `assessmentConverter`) are removed. `formatAssessmentPayload` and anything reused server-side should move to wherever makes sense (a new `services/assessmentService.ts` following the `billingAdminService.ts` naming convention is a reasonable default) — your call, justify it. Do not delete `calculateComputedScore`/`deriveRubricGrade` from `types/assessment.ts`; they're not Firestore-coupled and are reused by both the existing `evaluate` route and the new persistence route.
6. Check `components/biomechanics/LiveAssessmentDashboard.tsx` and `components/biomechanics/BiomechanicsSection.tsx` for any other direct Firestore assessment reads/writes beyond the hook, and report what you found.

# ARCHITECTURAL CONSTRAINTS
- `requireOwnership.ts` and `types.ts`'s `ResourceType` are the only `lib/auth/` files this phase may touch.
- Do not modify `prisma/schema.prisma` — the `Assessment` model already supports everything needed.
- Do not modify `/api/biomechanics/evaluate/route.ts`'s existing auth logic or tests unless Part 2's justified decision requires it — if you do touch it, explain exactly why in your report.
- Do not touch invoices or athletes routes/hooks/components beyond what's unavoidable (there should be none).

# SECURITY REQUIREMENTS
- Parent-scoped assessment list queries filter at the database level via the athlete join, never fetch-all-then-filter in application code.
- `athleteId` validation on create must happen before any write, and must not leak whether an athlete ID belongs to another family (a generic "athlete not found" is fine; don't differentiate "doesn't exist" from "exists but isn't yours" if that distinction would help enumerate other families' athlete IDs — treat both as equivalent to how `requireOwnership`'s existing not-found/not-owned branches already behave, for consistency).

# UX REQUIREMENTS
Same empty-vs-error distinction as the two prior phases. Preserve `AthleteProfileSection.tsx`'s and `LiveAssessmentDashboard.tsx`'s existing display behavior as much as possible — this phase changes the data source, not the feature set.

# DATA REQUIREMENTS
Same live local Postgres instance. Same judgment call as Phases 3.1/3.2 on real-DB integration tests vs. mocked-Prisma unit tests, justified per test. Given this phase adds new `requireOwnership` logic, at least one test should prove the join-based ownership check against real data (live rollback transaction), same rigor as Phase 3.2's athlete proof.

# IMPLEMENTATION GUIDANCE
1. Read every file listed above in full first.
2. Extend `requireOwnership` and its tests first — this is foundational and small.
3. Build the assessment routes.
4. Rewrite the hook.
5. Rewrite `RapidAssessmentForm.tsx`'s submission path.
6. Clean up `lib/assessmentConverters.ts`.
7. Check the two dashboard components for anything else touching Firestore assessment data.

# DO NOT DO
- Do not touch `requireRole.ts` or `verifyRequestAuth.ts`.
- Do not modify `prisma/schema.prisma`.
- Do not touch invoices or athletes code.
- Do not delete `calculateComputedScore`/`deriveRubricGrade` from `types/assessment.ts`.
- Do not leave any hardcoded/fallback assessment data reachable.
- Do not commit without running verification first; commit and push yourself.
- Do not silently omit any required report section.

# ACCEPTANCE CRITERIA
- `requireOwnership` correctly resolves assessment ownership via the athlete join, fail-closed on all error paths, with tests proving it — including at least one live-database proof.
- New assessment routes exist with correct `coach`/`admin` write gating and `requireOwnership` on single-resource reads.
- `athleteId` is validated against real `Athlete` records on creation.
- `BASELINE_ASSESSMENTS` and all Firestore assessment code is gone, not just unreachable.
- `git diff --stat` against current `origin/main` HEAD is confined to: `lib/auth/requireOwnership.ts`, `lib/auth/types.ts`, `lib/auth/auth.test.ts` (or your justified adjacent test file), `app/api/assessments/**` (new), `hooks/useAssessmentsSubscription.ts`, `components/biomechanics/RapidAssessmentForm.tsx`, `lib/assessmentConverters.ts`, any new service file, and whatever `LiveAssessmentDashboard.tsx`/`BiomechanicsSection.tsx` changes your investigation turns up.
- `npx tsc --noEmit`, `npx next build`, `npx vitest run` all pass, including all 46 existing tests.

# TESTING / VERIFICATION
Run and report, in order:
1. `npx vitest run` — full suite, every test name and pass/fail status.
2. `npx tsc --noEmit`
3. `npx next build`
4. `git diff --stat` against current `origin/main` HEAD — state the base commit hash.
5. Commit and push yourself; `git log origin/main --oneline -3` after.

# FINAL REPORT — REQUIRED FORMAT, all sections mandatory
1. **Files created/modified**, one-line description each.
2. **Full test list** — every test name and pass/fail status, noting which used a real Postgres connection.
3. **The `requireOwnership` extension**, quoted, and confirmation it follows the exact fail-closed pattern of the existing athlete/invoice branches.
4. **The evaluate-vs-persist decision** (kept separate or combined) and your reasoning.
5. **What you found in `LiveAssessmentDashboard.tsx`/`BiomechanicsSection.tsx`** regarding direct Firestore usage beyond the hook.
6. **Confirmation**: "Firestore is no longer used anywhere in the assessment read/write path."
7. **Confirmation**: "`BASELINE_ASSESSMENTS` and all fallback logic have been fully deleted, not just made unreachable."
8. **Confirmation**: "Invoices and athletes code was not touched in this phase."
9. **Full output** of all five verification commands, including the post-push `git log`.
10. **One paragraph**: with all three domains now on Postgres, what's left before Firestore can be removed from the project entirely (dependencies, config, `firestore.rules`, `firebase-applet-config.json`), and whether that's a reasonable Phase 3.4 or belongs elsewhere in the roadmap.
