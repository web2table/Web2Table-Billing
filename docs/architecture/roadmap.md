# Implementation roadmap

The sequence below is a proposed delivery plan. Each phase should be completed and reviewed before expanding scope.

## Phase 0 — Discovery and safety

- Inspect the Web2Table application repository and current Supabase migrations/schema.
- Map tenant, branch, subscription, billing, and payment records.
- Confirm current PayMongo parent-account setup and supported payment workflows.
- Confirm BIR invoicing workflow/provider boundaries.
- Record approved pricing and billable-branch rules.
- Confirm internal users, roles, and deployment environment.
- Choose the frontend/backend framework based on the existing Web2Table stack.

**Exit criteria:** signed-off data map, ownership matrix, payment flow, and security model.

## Phase 1 — Application foundation

- Establish framework and build tooling.
- Add environment validation and safe configuration.
- Implement internal authentication and role/permission checks.
- Add application shell, navigation, error handling, logging, and audit foundation.
- Add automated lint, type-check, test, and build workflows.

**Exit criteria:** secure deployable shell with no tenant financial mutations.

## Phase 2 — Read-only business visibility

- Tenant directory (limited business-facing metadata).
- Subscription overview.
- Payment transaction overview.
- Initial dashboard metrics with written definitions.
- Audit visibility and access controls.

**Exit criteria:** reconcile every displayed total to source records; no duplicated source of truth.

## Phase 3 — Billing and collection operations

- Billing period and charge snapshot visibility.
- Payment attempts and webhook event processing.
- Idempotent payment-state updates.
- Failed-payment and outstanding-balance monitoring.
- Payment-to-billing allocation and reconciliation.

**Exit criteria:** tested duplicate/out-of-order webhook handling and reconciled test transactions.

## Phase 4 — Finance operations

- Expense management.
- Revenue and collection reports.
- Export controls and audit trails.
- Approved adjustment/refund workflows.

**Exit criteria:** role-reviewed workflows and finance sign-off.

## Phase 5 — Production hardening

- Monitoring, alerting, backups, restore tests.
- Security and RLS review.
- Load and failure testing.
- Operational runbooks.
- Production deployment and domain configuration.

## Explicitly deferred

- Automatic recurring charging until provider capability and consent flow are confirmed.
- BIR invoice/receipt issuance until the approved third-party provider and compliance requirements are confirmed.
- Complex accounting/GL features until reviewed by a Philippine accounting professional.
- Microservices until measured scale or team structure requires them.
