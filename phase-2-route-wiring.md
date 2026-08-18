# TASK
Phase 2 — Wire the Phase 1 authorization middleware into the four existing API routes. Fix the invoice ID enumeration vulnerability. Add test coverage proving both.

# ROLE
You are a senior backend engineer working inside the AcademyHub repository (Next.js 15 / React 19 / Firebase Auth / Prisma). You are executing one bounded, reviewable phase of a larger migration plan.

# CONTEXT
Phase 0 built the Postgres schema (not yet live — no Cloud SQL instance provisioned, no data migrated). Phase 1 built `lib/auth/` — `verifyRequestAuth`, `requireRole`, `requireOwnership` — fully unit tested but not yet used anywhere in the application.

**Important scope boundary specific to this phase:** `requireOwnership` queries Postgres via Prisma. Because invoice and athlete data still lives in Firestore and no live Postgres instance exists yet, `requireOwnership` cannot be wired into any route in this phase — doing so would fail every request closed against an empty database. This phase wires authentication (`verifyRequestAuth`) and role checks (`requireRole`) only. Per-resource ownership enforcement (e.g. "can this parent pay this specific invoice") is explicitly deferred to the phase where invoice/athlete writes move to Postgres.

This means after this phase, a known residual gap remains: an authenticated parent with a valid invoice UUID belonging to another family could theoretically still complete checkout for it. This is accepted as a scoped, documented limitation for this phase — it is a large reduction in severity from the current state (fully unauthenticated + guessable 4-digit IDs), not a full fix. Do not attempt to work around this by adding an ad-hoc Firestore-based ownership check outside `lib/auth/` — that would duplicate logic Phase 1 already centralized and reintroduce the email-based ownership pattern already identified as insecure (unverified Firebase emails). Leave the gap named and deferred.

# OBJECTIVE
1. Every one of the four API routes rejects unauthenticated requests and enforces the correct role for that route's action.
2. Invoice IDs are no longer predictable/enumerable.
3. Test coverage proves both, for every route.

# PROBLEM
- `/api/gemini` — no authentication at all. Anyone can call it and consume Gemini API quota.
- `/api/biomechanics/evaluate` — no authentication. Anyone can submit fabricated assessment data.
- `/api/stripe/create-checkout-session` — no authentication. Combined with guessable invoice IDs, this exposes family PII (parent email, children's names) to anyone who requests it.
- `/api/stripe/webhook` — correctly verifies the Stripe signature already. This route is called by Stripe's servers, not a logged-in user, and must not have user-auth middleware added to it. Leave it as-is; do not modify its authentication model.
- `services/billingService.ts` line ~34: `const invoiceId = customId || input.id || \`INV-FAM-${Math.floor(1000 + Math.random() * 9000)}\`;` — only 9,000 possible values, brute-forceable in minutes against the (soon-to-be-authenticated-but-still-guessable-ID) checkout route.

# EXISTING BEHAVIOR / RELEVANT FILES TO INSPECT FIRST
- `lib/auth/verifyRequestAuth.ts`, `lib/auth/requireRole.ts`, `lib/auth/types.ts` (Phase 1 output) — the functions you're wiring in. Read their tests (`lib/auth/auth.test.ts`) to confirm exact error shapes (`AuthError` with `.statusCode` and `.message`).
- `app/api/gemini/route.ts`
- `app/api/biomechanics/evaluate/route.ts`
- `app/api/stripe/create-checkout-session/route.ts`
- `app/api/stripe/webhook/route.ts` — inspect only, do not modify its auth model.
- `services/billingService.ts` — the invoice ID generation line.
- `components/GeminiAdvisor.tsx` — inspect to determine which roles legitimately call `/api/gemini` before deciding the role list for that route. Do not guess; base the role list on how the component is actually used in the codebase. If usage is ambiguous, default to allowing all three authenticated roles (`admin`, `coach`, `parent`) and say so explicitly in your report — do not silently narrow it.
- `types/assessment.ts` — confirm `coach_id`/`coach_name` fields to justify restricting `/api/biomechanics/evaluate` to coach/admin.
- `app/api/biomechanics/evaluate/route.test.ts` and `lib/auth/auth.test.ts` — for house style on mocking in this repo's Vitest setup.

# DESIRED BEHAVIOR
- `/api/gemini`: requires a valid authenticated session (role list per your inspection of `GeminiAdvisor.tsx`, reported explicitly).
- `/api/biomechanics/evaluate`: requires `coach` or `admin` role.
- `/api/stripe/create-checkout-session`: requires `parent` or `admin` role (any authenticated parent, not yet scoped to their own invoice — see scope boundary above).
- `/api/stripe/webhook`: unchanged.
- Each protected route returns the correct HTTP status and a generic error body (no claim/token leakage) when `verifyRequestAuth` or `requireRole` throws — use `AuthError.statusCode` and `AuthError.message` from `lib/auth/types.ts` to build the response, don't invent new error shapes per route.
- `services/billingService.ts` generates invoice IDs via `crypto.randomUUID()` (or an equivalent cryptographically random generator) instead of the 4-digit random suffix. Confirm whether a prefix like `INV-` is expected by any consuming code (check `hooks/useInvoicesSubscription.ts`, `components/billing/BillingSection.tsx`) before deciding the final ID format — if nothing depends on the `INV-FAM-` prefix specifically, a plain UUID is acceptable; if something parses or displays the prefix, preserve a prefix but make the random portion a full UUID, not a 4-digit number.

# ARCHITECTURAL CONSTRAINTS
- Do not modify `app/api/stripe/webhook/route.ts`'s authentication model. It is correct as-is (Stripe signature verification). You may inspect it but must not add `verifyRequestAuth`/`requireRole` to it.
- Do not modify anything under `lib/auth/` — Phase 1 is complete and verified. If you find a genuine defect in it while wiring it in, stop and report it rather than editing it directly.
- Do not add any `requireOwnership` call anywhere in this phase — no live Postgres data exists yet, and doing so would break every request. This is a hard constraint, not a style preference.
- Do not add any Firestore-based ownership check as a substitute for `requireOwnership`. The deferred gap stays deferred and documented, not worked around.
- Do not modify `services/billingAdminService.ts`'s data source (still Firestore) — only the ID generation in `services/billingService.ts` changes.
- Do not touch UI components except as needed to confirm assumptions (read-only inspection of `GeminiAdvisor.tsx`, `BillingSection.tsx`, `useInvoicesSubscription.ts` is fine; do not edit them).

# SECURITY REQUIREMENTS
- Every protected route must reject with the correct status code before executing any business logic (Gemini call, Stripe call, Firestore write) — auth check must be the first thing that runs in the handler, not interleaved with logic.
- Error responses must not leak whether resource lookups failed vs. auth failed, and must not include decoded token contents.
- The new invoice ID generation must not be predictable or guessable — no timestamp-only or sequential schemes.

# UX REQUIREMENTS
Not applicable — no UI changes in this phase. Note for the human reviewer: once these routes require auth, any client-side calls to them (if the UI currently calls these routes without an Authorization header) will start failing. Check whether `components/GeminiAdvisor.tsx`, `components/biomechanics/RapidAssessmentForm.tsx`, and the Stripe checkout trigger currently attach a Firebase ID token to their requests. If they don't, report this explicitly — it's a Phase 3 UI concern, not something to fix in this phase, but it must be flagged so it isn't a surprise.

# DATA REQUIREMENTS
No live database connection (Postgres or otherwise) is required for this phase's tests — mock `verifyRequestAuth` and `requireRole` in route tests via `vi.mock('@/lib/auth/verifyRequestAuth')` etc., following the pattern already established in `lib/auth/auth.test.ts`.

# IMPLEMENTATION GUIDANCE
1. Read all files listed above in full before writing code.
2. For each protected route, add an early-return auth check: call `verifyRequestAuth(request)`, then `requireRole(user, [...])`, catch `AuthError` and return the appropriate NextResponse with its `statusCode`/`message`.
3. Fix the invoice ID generation as a small, isolated change.
4. Extend or add test files per route covering: request with no Authorization header rejected, request with wrong role rejected, request with correct role proceeds to existing business logic (existing tests should still pass for the happy path).

# DO NOT DO
- Do not add `requireOwnership` anywhere in this phase.
- Do not modify the webhook route's auth model.
- Do not modify `lib/auth/` internals.
- Do not add a parallel/ad-hoc ownership check outside `lib/auth/`.
- Do not invent role requirements without checking actual component usage — report your reasoning for each route's role list.
- Do not touch UI component logic beyond read-only inspection.
- Do not silently omit any required report section (see Phase 0/1 history: reports have twice omitted required sections and had to be corrected after the fact — include every section below in full the first time).

# ACCEPTANCE CRITERIA
- All three non-webhook routes reject unauthenticated requests with 401 and wrong-role requests with 403, proven by tests.
- Webhook route's test coverage (if any existed) is unchanged; its auth model is untouched.
- Invoice IDs are generated via a cryptographically random method; no 4-digit or otherwise brute-forceable scheme remains anywhere in `services/billingService.ts`.
- `git diff --stat` against current `origin/main` HEAD shows changes confined to: the three route files, `services/billingService.ts`, and their corresponding test files (new or modified) — nothing else.
- `npx tsc --noEmit`, `npx next build`, and `npx vitest run` all pass, including all prior tests (26 total baseline: 5 + 21) plus new Phase 2 tests.

# TESTING / VERIFICATION
Run and report, in order:
1. `npx vitest run` — full suite, all test names and pass/fail status, not a summary count.
2. `npx tsc --noEmit`
3. `npx next build`
4. `git diff --stat` against current `origin/main` HEAD — state the base commit hash.
5. `git log origin/main --oneline -3` after pushing, to prove the push happened, before declaring completion.

# FINAL REPORT — REQUIRED FORMAT (all sections mandatory, do not omit any)
1. **Role list chosen for `/api/gemini`**, with the reasoning from inspecting `GeminiAdvisor.tsx`.
2. **Files created/modified**, one-line description each.
3. **Full test list** — every test case name and pass/fail status.
4. **Invoice ID format chosen**, and why (prefix decision, based on what you found in consuming code).
5. **UX flag**: whether any current UI code calls these routes without an Authorization header (per the UX Requirements section above) — this is expected to be a real finding, report it plainly.
6. **Explicit confirmation**: "The webhook route's authentication model was not modified" and "No `requireOwnership` call was added anywhere."
7. **Full output** of all five verification commands above, including the post-push `git log`.
8. **One paragraph** on what the next phase (moving invoice/athlete writes to Postgres, enabling real `requireOwnership` enforcement) needs to do.
