# Data ownership and integration boundaries

## Source-of-truth policy

Before creating tables, inspect the existing Web2Table Supabase project and migrations. Reuse canonical tenant, branch, subscription, and payment references where they already exist. This repository must not create shadow copies that can drift.

The Business application may maintain its own business-only records (for example internal expense entries, business notes, reconciliation decisions, and audit events) in a clearly namespaced schema or tables after the existing schema is reviewed.

## Proposed logical data groups

These are conceptual groups, not approved SQL table names:

| Data group | Likely owner | Notes |
|---|---|---|
| Tenant and branch identity | Existing Web2Table platform | Reference canonical IDs |
| Subscription state | Existing subscription service / agreed canonical owner | Define one authoritative writer |
| Billing periods and charge snapshots | Billing module | Immutable finalized snapshots |
| Payment attempts and provider events | Payments module | Idempotent provider references |
| Payment allocations | Payments module | Link collections to billing records |
| Expenses | Expense module | Internal company expenses |
| Audit events | Audit module | Append-only |
| Analytics projections | Analytics module | Rebuildable from source facts |

## Critical decisions to settle

1. Which existing Supabase tables hold tenants, branches, subscription state, and payments?
2. Which application/service is the authoritative writer for each subscription field?
3. Is the tenant billed per active branch, per subscribed branch, or by another explicit rule?
4. What constitutes an active billable branch, and when do additions/removals take effect?
5. How are proration, failed charges, retries, grace periods, cancellations, and refunds handled?
6. Does the existing PayMongo parent account support the selected recurring-payment workflow, or must the owner initiate each payment?
7. Which invoicing provider issues BIR-compliant documents, and what records must be handed off?

Do not implement automatic recurring debits until PayMongo account capabilities, consent, payment-method flow, and applicable provider requirements have been verified.

## Data access

- Browser clients receive only data authorized for the current internal user.
- Supabase service-role credentials are server-only.
- Prefer narrowly scoped server APIs and database functions.
- Apply least-privilege grants and RLS where appropriate.
- Internal business roles must not grant access to restaurant operational data by default.
- Keep provider secrets and webhook signing secrets out of database rows accessible to clients.

## Multi-tenant safety

Web2Table Business is an internal company application, not a tenant-facing shared workspace. Internal access is restricted to approved Web2Table personnel. If tenant-level data is shown, return only the minimum fields required for the business task.

Never trust a tenant ID, amount, subscription status, or payment status supplied by the browser without server-side authorization and authoritative lookup.
