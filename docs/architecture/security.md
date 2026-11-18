# Security and operational controls

## Authentication and authorization

- Use an approved internal authentication method compatible with the existing Supabase Auth setup.
- Restrict sign-up; internal accounts are provisioned or invited by authorized administrators.
- Enforce role and permission checks server-side on every query and mutation.
- Require stronger verification for sensitive operations where supported.
- Revoke access promptly when staff leave or change responsibilities.

## Secrets

- Supabase service-role key: server-side only.
- PayMongo secret API key: server-side only.
- Webhook signing/verification secret: server-side only.
- Never include secrets in source control, logs, browser bundles, or error messages.
- Use separate development and production credentials.

## Payment integrity

- Verify webhook authenticity using the current provider-prescribed method.
- Store provider event IDs and enforce idempotency.
- Treat webhook delivery as at-least-once; duplicate delivery must not duplicate collections.
- Do not mark a charge paid from a browser redirect or frontend success screen.
- Confirm amounts, currencies, references, and payment status from trusted provider data.
- Record refunds, reversals, disputes, and manual adjustments as traceable events.
- Reconcile provider transactions against internal billing records.

## Financial controls

- Separate preparation and approval for material manual adjustments/refunds where staffing permits.
- Do not delete finalized billing or payment records to hide history.
- Use reversal/adjustment records.
- Record actor, timestamp, reason, and reference for sensitive actions.
- Export access should be permissioned and audited.

## Privacy

- Store only data needed for business operations.
- Avoid storing full payment credentials or unnecessary customer personal data.
- Mask sensitive identifiers in lists and logs.
- Define retention and deletion policies before launch.

## Reliability

- Use structured logs with correlation IDs.
- Alert on webhook processing failures and reconciliation mismatches.
- Retry transient integration errors safely.
- Make scheduled billing jobs idempotent and observable.
- Back up important data and test restoration before production.
