# Web2Table Business

The standalone internal business management platform for Web2Table.

**Planned URL:** `business.web2table.io`  
**Repository:** `web2table/Web2Table-Billing`

## Purpose

Operate the Web2Table business independently from restaurant operations and technical platform administration. The application provides internal visibility and controlled workflows for subscription revenue, collections, tenant accounts, financial reporting, and company expenses.

## Architecture

This repository starts with an architecture blueprint. The GitHub repository was empty when initialized, so no application framework or runtime has been assumed.

The system is designed as a **modular monolith**: one deployable application with explicit business modules, clear ownership, and controlled interfaces. Modules can be extracted later if scale or operational needs justify it.

See:
- [Architecture](docs/architecture/README.md)
- [Modules](docs/architecture/modules.md)
- [Data boundaries](docs/architecture/data-boundaries.md)
- [Security](docs/architecture/security.md)
- [Implementation roadmap](docs/architecture/roadmap.md)

## Core principles

1. Business management is separate from the Restaurant Owner Workspace and System Admin.
2. The restaurant owner remains responsible for managing their own subscription from their workspace.
3. This application is an internal business operations and financial visibility system; it must not become a second tenant operations console.
4. Supabase is the existing Web2Table data platform, subject to explicit schema and access boundaries.
5. PayMongo credentials and payment operations are handled server-side only.
6. Payment webhooks are verified, idempotent, auditable, and the source of payment-state transitions.
7. Financial records are traceable; adjustments are never silently overwritten.
8. Philippine Peso (PHP) and Asia/Manila are the initial business currency and timezone assumptions.

## Current status

Architecture foundation only. No production code, schema migrations, PayMongo calls, or deployment configuration have been added yet.

## Before implementation

Confirm the existing Web2Table Supabase schema, tenant/branch identifiers, authentication model, PayMongo account arrangement, and current subscription/payment flows. Do not create duplicate sources of truth.
