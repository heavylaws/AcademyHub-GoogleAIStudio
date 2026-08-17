# AcademyHub — Definition of Done

A work item may be called **DONE** only when all applicable gates below pass.

## Product

- [ ] The intended user and workflow are clear.
- [ ] The implementation solves the actual problem rather than only the visible symptom.
- [ ] Acceptance criteria are satisfied.
- [ ] Existing important workflows remain intact.

## Engineering

- [ ] TypeScript/type checks pass where applicable.
- [ ] Lint passes or documented pre-existing exceptions are understood.
- [ ] Tests are added or updated for meaningful behavior.
- [ ] No unnecessary dependency or abstraction was introduced.
- [ ] Error and edge cases are handled intentionally.

## Security

- [ ] Authentication is correct.
- [ ] Authorization is enforced at the correct trust boundary.
- [ ] Firestore/server rules remain secure.
- [ ] Untrusted input is validated.
- [ ] No secrets or credentials were introduced.

## UX

- [ ] Loading state is intentional.
- [ ] Empty state is intentional.
- [ ] Error state is useful.
- [ ] Permission-denied behavior is clear where applicable.
- [ ] Mobile behavior is verified.
- [ ] Accessibility is considered.

## Verification

- [ ] Relevant automated tests pass.
- [ ] Relevant build passes.
- [ ] Relevant lint/type checks pass.
- [ ] Runtime behavior is checked when practical.
- [ ] Final diff has been reviewed for accidental changes.

## Documentation

- [ ] Architecture or operating documentation is updated when necessary.
- [ ] New assumptions or limitations are documented.
- [ ] User-facing documentation is updated when behavior changes.

## Release

- [ ] No known Critical issue remains.
- [ ] High-risk regressions have been addressed or explicitly accepted.
- [ ] Rollback/recovery implications are understood for consequential changes.
- [ ] The final report states evidence, not merely confidence.
