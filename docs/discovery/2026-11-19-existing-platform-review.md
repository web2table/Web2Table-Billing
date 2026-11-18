# Existing platform review — 2026-11-19

## Scope

Reviewed the default branch of `web2table/Multi-Tenant-Restaurant-Ordering-Platform-SaaS`, including the tenant foundation migration, tenant PayMongo onboarding migration, PayMongo v2 fee-accounting migration, live-only PayMongo migration, and the parent/tenant PayMongo webhook and onboarding Edge Functions.

This is a repository-level review. It is not a live database introspection and does not prove which migrations have been applied to the production Supabase project.

## Confirmed existing platform structures

### Tenant and branch identity

The platform foundation defines:

- `public.tenants` with canonical tenant UUID, slug, name, and lifecycle status.
- `public.branches` with canonical branch UUID, tenant UUID, slug, name, timezone, and active flag.
- `public.tenant_memberships` and `public.branch_memberships` for tenant/branch access.

The Business application must reference these IDs. It must not create a second tenant or branch master.

### Restaurant PayMongo accounts

The platform defines `public.tenant_paymongo_accounts`, keyed by tenant and environment. It tracks a restaurant's PayMongo child merchant account, activation/onboarding status, child webhook details, and verification state.

The reviewed onboarding Edge Functions authenticate the restaurant owner and verify active owner membership before creating or activating a tenant child account.

### Restaurant order payments

The platform uses `public.customer_order_payment_sessions` for restaurant customer order payment attempts and provider references. The PayMongo v2 fee-accounting migration adds gross, fee, and net amount snapshots to this order-payment model.

The tenant PayMongo webhook verifies the child-account webhook signature, claims webhook event IDs, checks payment amounts and currency, and finalizes restaurant order payments through database RPCs.

These are restaurant order payment records. They are not Web2Table subscription invoices or collections.

### Parent PayMongo webhook

The reviewed `paymongo-parent-webhook` handles PayMongo parent-account lifecycle events for linked merchant accounts, including activation and identity-verification results. It maps child account IDs back to tenant records and verifies activation against PayMongo before marking a restaurant child account active.

It is not a subscription billing webhook and must not be repurposed as one without a separately designed event contract.

### Live-only environment

The reviewed migration `20261116090000_retire_paymongo_test_mode.sql` removes test-mode order-payment and tenant PayMongo account records and constrains the reviewed payment tables to live mode.

Do not reintroduce test-mode assumptions into the existing restaurant payment flow.

## Subscription and billing gap

The reviewed migration inventory contains the tenant foundation, restaurant PayMongo onboarding, restaurant order payment, refund, and fee-accounting work. No dedicated subscription, subscription billing-period, subscription invoice, or Web2Table subscription collection migration was identified in that inventory.

This means the business application should not assume that a canonical subscription ledger already exists.

Before implementing billing, inspect the actual target Supabase database and confirm the applied migration set. Then approve the new business subscription data model and its ownership rules.

## Recommended ownership boundary

| Capability | Owner |
|---|---|
| Tenant and branch identity | Existing Web2Table platform |
| Restaurant order payment | Existing restaurant order payment subsystem |
| Restaurant PayMongo child account | Existing tenant PayMongo onboarding |
| Restaurant owner subscription actions | Restaurant Owner Workspace |
| Internal subscription oversight | Web2Table Business |
| Subscription billing records and collection reconciliation | New business billing capability, after approval |
| Technical platform administration | System Admin |

The Restaurant Owner Workspace should remain the place where the restaurant owner views and manages their subscription. Web2Table Business may provide internal oversight and authorized finance operations. System Admin should not become the subscription operator.

## PayMongo design constraint

Do not assume that the existing parent account's linked-account setup automatically supports the recurring subscription collection flow we want.

Before implementing a charge:

1. Confirm the approved merchant/payee arrangement for Web2Table subscription fees.
2. Confirm the PayMongo product and payment method that will be used.
3. Confirm whether the intended monthly flow is an owner-initiated checkout or an approved recurring-payment/mandate flow.
4. Confirm consent, payment-method storage, retry, cancellation, and webhook requirements.
5. Define the subscription charge and billing-period record independently from restaurant customer orders.
6. Verify current PayMongo API capabilities and requirements before production implementation.

No automatic recurring debit should be implemented based only on the existence of a PayMongo parent account.

## Next implementation gate

1. Inspect live Supabase schema and applied migrations.
2. Agree on the subscription commercial model and billable unit.
3. Define subscription, billing-period, payment-attempt, allocation, and audit invariants.
4. Define the server-side webhook and reconciliation contract.
5. Only then add database migrations and application integration.

## Review limitations

- This review did not connect to the production Supabase database.
- It did not create or charge a PayMongo transaction.
- It did not verify current PayMongo account capabilities with PayMongo.
- It did not approve a plan price, branch billing basis, tax treatment, or automatic recurring charge.
