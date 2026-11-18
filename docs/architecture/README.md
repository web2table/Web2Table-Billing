# Architecture overview

## System context

Web2Table consists of three distinct application surfaces:

| Surface | Primary responsibility |
|---|---|
| Restaurant Owner Workspace | Restaurant operations and owner-managed subscription experience |
| Web2Table Business | Internal company operations, subscription oversight, collections, and finances |
| System Admin | Technical platform administration, maintenance, and operational controls |

The Business application must not absorb restaurant order, menu, cashier, kitchen, dispatcher, or rider workflows.

## Deployment shape

Start as a modular monolith:

- One frontend application and one backend/API boundary.
- Business capabilities split into domain modules.
- Shared infrastructure adapters for Supabase, PayMongo, logging, and notifications.
- No cross-module access to another module's internal tables or implementation details.
- Background jobs and webhook handlers invoke module application services rather than writing arbitrary database state.

Do not introduce microservices before there is a demonstrated need.

## Logical layers

1. **Presentation** — routes, pages, layouts, forms, and view models.
2. **Application** — use cases, commands, queries, orchestration, and authorization checks.
3. **Domain** — entities, value objects, invariants, and domain policies.
4. **Infrastructure** — Supabase repositories, PayMongo adapter, email/notification adapters, scheduler, and observability.

Dependencies point inward. Domain logic must not depend on React, Supabase SDKs, PayMongo SDKs, or HTTP request objects.

## Suggested module map

- Identity & Access
- Business Dashboard
- Tenant Accounts
- Subscription Oversight
- Billing & Invoicing Records
- Payments & Reconciliation
- Revenue Analytics
- Expense Management
- Financial Reporting
- Audit & Compliance
- Platform Integrations

See [modules.md](modules.md) for responsibilities and boundaries.

## Integration boundary

The Business application reads and acts on the shared Web2Table business data only through approved server-side services and repositories. It should reuse existing tenant and branch identities instead of inventing new ones.

Restaurant owners continue to initiate and manage subscriptions from the Restaurant Owner Workspace. The business application may monitor subscription status and collections, and perform explicitly authorized internal finance workflows. It must not silently take over owner-facing subscription actions.

## Non-goals

- Replacing the Restaurant Owner Workspace.
- Replacing System Admin.
- Becoming a POS, order management, or restaurant operations system.
- Storing raw card details.
- Treating browser state or a client-side redirect as proof of payment.
- Maintaining a second, conflicting tenant or subscription ledger.
