# Master Fix Prompt — Stripe Auth Architecture, Installment Billing, Model Regression

This covers 3 issues found in code you already shipped without going through
review (Prompt 4 / Stripe, and part of Prompt 6 / model check). Read all of
this before starting — the three fixes touch overlapping files. Do not
execute anything beyond what's listed here without sending it back for
approval first, including any further prompts from the original 6-prompt
plan (Prompt 5 — component splitting — is NOT part of this and should not
be started).

---

## Fix 1 — Revert the Gemini model regression

File: `app/api/biomechanics/evaluate/route.ts`

You changed `gemini-3.7-flash` to `gemini-2.5-flash` believing the original
was invalid. It wasn't — `gemini-3.7-flash` is a real, current, GA model on
the exact `@google/genai` `generateContent` API this file uses. Your
replacement, `gemini-2.5-flash`, is valid but Google has announced it shuts
down October 16, 2026.

Change the model string to `gemini-3.6-flash` instead — confirmed current
GA workhorse model, compatible with `generateContent`, not on a
deprecation timeline. Do not use `gemini-3.7-flash` or `gemini-2.5-flash`.

```diff
-        model: 'gemini-2.5-flash',
+        model: 'gemini-3.6-flash',
```

Update the corresponding assertion in
`app/api/biomechanics/evaluate/route.test.ts` if the model string is
referenced anywhere in test expectations (check — it may not be, since the
tests mock the SDK client rather than asserting on the string itself).

---

## Fix 2 — Stripe routes must use Firebase Admin SDK, not the client SDK

Files: `lib/firebase.ts` (read-only reference, don't modify),
new `lib/firebaseAdmin.ts`, new `services/billingAdminService.ts`,
modify `app/api/stripe/create-checkout-session/route.ts`,
modify `app/api/stripe/webhook/route.ts`,
modify `services/billingService.ts` (remove one function — see below).

### The problem
`app/api/stripe/create-checkout-session/route.ts` and
`app/api/stripe/webhook/route.ts` both call functions from
`services/billingService.ts`, which uses the **client** Firebase SDK
(`getFirestore(app)` from `lib/firebase.ts`, no `firebase-admin` anywhere).
That's correct when called from React components in the browser, where a
real signed-in user exists. It is not correct called from a server-side
Next.js API route, where `auth.currentUser` is always `null`.

`firestore.rules` requires `isAdmin()` for invoice writes and
`isAdmin() || isParentOf(...)` for reads. With no authenticated user
context on the server, both evaluate false. Concretely:
- `create-checkout-session` calls `getInvoiceById` to read the invoice —
  will hit `permission-denied` before it ever reaches Stripe.
- The webhook calls `updateInvoice` to mark an invoice `paid` after a
  successful charge — will also hit `permission-denied`. A customer could
  be charged successfully by Stripe and their invoice would never update.

### The fix

1. **Add `firebase-admin` as a root dependency** (not just in `functions/`
   — these are Next.js API routes bundled by Next, not deployed via
   Firebase CLI, so they need it in the main `package.json`):
   ```bash
   npm install firebase-admin
   ```

2. **Create `lib/firebaseAdmin.ts`** — singleton Admin SDK init, following
   the same guard pattern already used in `functions/setUserRole.ts`:
   ```typescript
   import * as admin from 'firebase-admin';

   if (!admin.apps.length) {
     admin.initializeApp({
       credential: admin.credential.applicationDefault(),
     });
   }

   export const adminDb = admin.firestore();
   export default admin;
   ```
   Add a comment explaining that in production this expects
   `GOOGLE_APPLICATION_CREDENTIALS` to point to a service account JSON
   file, OR (for platforms like Cloud Run / AI Studio hosting where that's
   awkward) support an alternate path reading a
   `FIREBASE_SERVICE_ACCOUNT_KEY` env var containing the JSON directly,
   falling back to `applicationDefault()` if that env var isn't set. Add
   both options to `.env.example` with comments explaining when each
   applies.

3. **Create `services/billingAdminService.ts`** — server-only, imports
   `adminDb` from `lib/firebaseAdmin.ts`, NOT the client `db`. Two
   functions only:
   - `getInvoiceByIdAdmin(invoiceId: string): Promise<FamilyInvoice | null>`
   - `updateInvoiceAdmin(invoiceId: string, updates: UpdateInvoiceInput): Promise<void>`

   These bypass Firestore security rules entirely (Admin SDK always has
   full access) — that's expected and correct for a payment webhook, but
   make sure this file is never imported from any client component. Add a
   comment at the top of the file stating that explicitly.

4. **Remove `getInvoiceById` from `services/billingService.ts`.** You
   added this function to that file without it being part of the approved
   Prompt 3 diff. It doesn't work correctly server-side (see problem
   above) and shouldn't exist in the client-facing service. The admin
   version in step 3 replaces it for server use; nothing client-side
   currently calls `getInvoiceById`, so removing it is safe — confirm
   that with a repo-wide grep before deleting.

5. **Update `app/api/stripe/create-checkout-session/route.ts`** to import
   `getInvoiceByIdAdmin` from `@/services/billingAdminService` instead of
   `getInvoiceById` from `@/services/billingService`.

6. **Update `app/api/stripe/webhook/route.ts`** to import
   `updateInvoiceAdmin` from `@/services/billingAdminService` instead of
   `updateInvoice` from `@/services/billingService`.

---

## Fix 3 — Stripe charges the wrong amount

File: `app/api/stripe/create-checkout-session/route.ts`,
`app/api/stripe/webhook/route.ts`,
`components/billing/BillingSection.tsx`

### The problem
The checkout session currently charges `invoice.netTotal` in full, in one
Stripe payment, regardless of which `paymentSchedule` the family chose.
A family on a 3-part `monthly` plan would be charged the entire amount at
once instead of one installment. It also ignores the 5% early-pay discount
built into the `upfront` schedule's due amount
(`installmentBreakdown[0].amount` is already the correct, schedule-aware
number — `netTotal` is not).

### The fix — v1 scope: charge the current installment only

1. In `create-checkout-session/route.ts`, change the Stripe line item to
   charge `invoice.installmentBreakdown[0].amount` (the first, currently
   "Due Now" installment) instead of `invoice.netTotal`. This is already
   correct for all three schedules: `upfront` has exactly one installment
   at 95% of net, `2-part` and `monthly` both have their first installment
   pre-calculated correctly in `getInstallments()`.

   Update the `product_data.description` to make clear this is the
   current installment, not the full invoice, when `installmentBreakdown.length > 1`
   — e.g. `Installment 1 of ${installmentBreakdown.length} for: ...`.

2. In `components/billing/BillingSection.tsx`, update the "Pay with
   Stripe" button text from
   `Pay with Stripe (${selectedInvoiceModal.netTotal}.00)` to reflect the
   actual charge amount:
   `Pay with Stripe (${selectedInvoiceModal.installmentBreakdown[0]?.amount}.00)`.

3. In `webhook/route.ts`, on `checkout.session.completed`: instead of
   unconditionally setting `payment_status: 'paid'`, update
   `installmentBreakdown[0].status` to `'Paid'` on that invoice, and only
   set `payment_status: 'paid'` on the invoice itself if
   `installmentBreakdown.length === 1` (i.e. it was an `upfront` payment
   with nothing left owing). For `2-part`/`monthly` invoices, leave
   `payment_status` as `'pending'` after the first installment — full
   multi-installment payment tracking (paying installment 2 and 3 later)
   is explicitly out of scope for this fix; note this as a known
   limitation in a code comment, don't silently build partial support for
   it.

---

## Verification (required before reporting done)

1. `npx tsc --noEmit` — zero errors.
2. `npx next build` — zero errors.
3. `npx vitest run` — all existing tests still pass (the biomechanics
   route tests shouldn't be affected by any of this, but confirm).
4. Grep the repo for any remaining import of `getInvoiceById` from
   `@/services/billingService` (client) — should be zero results outside
   its own removed definition.
5. Grep the repo for any import of `services/billingAdminService` from a
   file under `components/` or any other `'use client'` file — should be
   zero results. This file must only ever be imported by
   `app/api/stripe/*` routes.
6. `git status --short`, then commit and `git push origin main`. Confirm
   the push succeeded (show me `git log -1` output) — don't report done
   until the push is confirmed, not just a local clean build.

Show me the full diff for every file before committing.
