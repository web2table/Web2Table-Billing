# Module boundaries

Each module owns its use cases, domain rules, validation, and persistence interface. Other modules interact through public application services or events, not direct table access.

## 1. Identity & Access

**Owns:** internal user profiles, roles, permissions, session policy, and access audit.

**Initial roles (proposal):**
- Business Owner: full business-level access.
- Finance: billing, payment, reconciliation, expenses, and reports.
- Operations: tenant and subscription visibility with limited actions.
- Read-only Auditor: view-only access to permitted records.

Enforce authorization on the server for every sensitive operation. UI hiding is not authorization.

## 2. Business Dashboard

**Owns:** read models and KPIs for the internal business overview.

**Displays:** collected revenue, recurring revenue indicators, active subscriptions, failed collections, overdue accounts, branch counts, and recent activity.

Dashboard metrics must document their definitions. Do not label gross collections as recognized revenue or treat a pending payment as collected cash.

## 3. Tenant Accounts

**Owns:** internal business-facing tenant directory, relationship metadata, and account notes.

**References:** canonical tenant and branch IDs from Web2Table's existing platform. It must not create duplicate tenant or branch masters.

**Does not own:** restaurant menus, orders, staff, or storefront configuration.

## 4. Subscription Oversight

**Owns:** internal subscription visibility, plan/price catalog governance (when approved), billing status monitoring, and subscription-change audit.

**Owner-facing actions:** remain in Restaurant Owner Workspace unless an explicit business policy authorizes a narrowly scoped exception.

Subscription status must be derived from trusted backend state, not client callbacks.

## 5. Billing Records

**Owns:** billing periods, charge calculations/snapshots, billing line items, adjustments, and statements/records.

A finalized billing record must preserve the amount, currency, billing period, applicable plan/branch basis, and calculation version. Recalculation must not silently rewrite a finalized record.

Do not assume that a tax invoice or BIR-compliant receipt is issued by this application. Confirm the approved invoicing provider and Philippine compliance requirements before implementing document issuance.

## 6. Payments & Reconciliation

**Owns:** payment attempts, provider references, verified webhook events, payment allocations, refunds/adjustments where supported, and reconciliation status.

PayMongo integration is server-side. Verify webhook signatures according to current PayMongo documentation, persist event identifiers, process idempotently, and reconcile provider records against internal billing records.

Never store card numbers, CVV, or raw payment credentials.

## 7. Revenue Analytics

**Owns:** analytical projections and historical summaries based on billing and payment facts.

Separate at minimum:
- Billed amount
- Successfully collected amount
- Refunds and reversals
- Outstanding balance
- Recurring revenue indicators

Define MRR consistently, including treatment of discounts, pauses, cancellations, proration, and overdue subscriptions.

## 8. Expense Management

**Owns:** company operating expenses, vendors, categories, attachments/references, and approval history.

Expenses are Web2Table company expenses, not restaurant tenant expenses. Track payment date, expense date, currency, category, and supporting evidence.

## 9. Financial Reporting

**Owns:** date-range reports and exports built from audited billing, payment, and expense data.

Reports should identify whether they are cash-based operational summaries or accounting/tax reports. Do not claim statutory accounting or tax compliance until reviewed by a qualified Philippine accountant.

## 10. Audit & Compliance

**Owns:** append-only business audit events for sensitive access, billing adjustments, payment actions, exports, and permission changes.

Audit entries should capture actor, action, target, timestamp, correlation ID, and relevant before/after values while avoiding secrets and unnecessary personal data.

## 11. Platform Integrations

**Owns:** configuration interfaces and adapters for Supabase, PayMongo, notifications, and future accounting/invoicing providers.

Secrets stay in server-side environment/secret storage. Never expose service-role keys or PayMongo secret keys to the browser.

## Module dependency rules

- Dashboard and Analytics consume other modules' published read models; they do not own source transactions.
- Payments references billing records; it does not calculate the commercial price itself.
- Billing references canonical tenant/branch IDs and approved subscription terms.
- Tenant Accounts references platform identities; it does not duplicate them.
- All sensitive actions pass through Identity & Access and Audit.
- Integrations are called behind interfaces from application services.
