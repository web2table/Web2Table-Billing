# Subscription billing — proposed domain model

**Status:** Proposed; not a production schema or an approved pricing policy.

## Product boundary

Web2Table subscription billing is a business-to-business relationship between Web2Table and a restaurant tenant.

It is separate from the tenant's PayMongo child merchant account and from customer order payments processed for that restaurant.

## Application ownership

- Restaurant Owner Workspace: owner-facing subscription status, plan information, billing details, and owner-initiated subscription actions.
- Web2Table Business: internal subscription oversight, billing records, collections, failed-payment follow-up, reconciliation, and approved finance adjustments.
- System Admin: technical platform administration only; it does not manage subscription billing operations.

The owner-facing workspace and internal business workspace must use the same authoritative subscription and billing records through authorized server-side interfaces.

## Proposed entities

These are conceptual entities. Table names and columns require schema review and approval.

### Subscription

Represents the tenant's commercial subscription relationship.

Potential attributes:
- Subscription ID
- Canonical tenant ID
- Plan/version reference
- Status and lifecycle timestamps
- Billing cadence
- Currency
- Agreed price and pricing basis
- Effective date and cancellation date

There should be one authoritative subscription state per agreed subscription scope. Do not duplicate subscription status independently in the owner and business applications.

### Subscription plan and price version

Represents the commercial offer accepted by a tenant.

A price change must not rewrite historical billing records. Existing subscriptions need a defined rule for whether a new price applies immediately, at renewal, or only after an accepted plan change.

### Billing period / invoice record

Represents an amount due for a defined service period.

A finalized record should preserve:
- Tenant and subscription references
- Period start and end
- Currency
- Price and quantity/billing basis snapshot
- Discounts, credits, taxes, and adjustments where applicable
- Final amount due
- Due date
- Status and finalization timestamp

A finalized billing record should be immutable. Corrections should use explicit adjustment or reversal records.

Do not call this a BIR-compliant invoice or receipt unless the approved third-party invoicing provider actually issues the required document.

### Payment attempt

Represents one attempt to collect a specific billing record.

Potential attributes:
- Billing record ID
- Provider and merchant account reference
- Provider checkout/payment reference
- Amount and currency
- Attempt status
- Idempotency key
- Created, paid, failed, or expired timestamps

A browser redirect must never be treated as proof of payment.

### Provider webhook event

Stores provider event identity, event type, signature-verification outcome, processing status, attempt count, and timestamps. Event processing must be idempotent and recoverable.

### Payment allocation

Connects a verified collection to the billing record or records it settles. This permits partial payments, overpayments, refunds, and reconciliation without overwriting the original provider transaction.

### Business audit event

Records actor, action, target, reason, timestamp, and correlation ID for sensitive subscription, billing, payment, refund, and access changes.

## Lifecycle rules to approve

- Trial and activation, if offered
- Billing period and due date
- Grace period
- Failed payment and retry policy
- Suspension and reactivation
- Cancellation and end-of-term behavior
- Plan and price changes
- Branch additions/removals and effective date
- Partial payment and outstanding balance
- Refund, reversal, dispute, and manual adjustment

## Unresolved commercial decisions

Do not infer these from the UI or hard-code them:

1. Is billing per tenant, per branch, per active branch, or by another unit?
2. Is the proposed PHP 1,500 monthly amount a tenant-wide price or a per-branch price?
3. Are all branches charged equally, and how are new branches prorated?
4. When does the first billing period start?
5. Is payment owner-initiated each month or automatically recurring with explicit provider support and customer consent?
6. What is the grace period and when can platform access be suspended?
7. Which third-party provider issues the required BIR documents?

## Financial invariants

- Store money in integer minor units (centavos) and preserve currency.
- A payment is collected only after trusted provider verification.
- Duplicate webhook delivery must not duplicate payment allocations.
- Every collection must reconcile to a billing record or an explicitly identified unallocated balance.
- Refunds and adjustments must be traceable; never delete the original payment.
- Analytics must distinguish billed, collected, outstanding, refunded, and recurring revenue.
- A tenant's restaurant customer revenue is not Web2Table subscription revenue.
