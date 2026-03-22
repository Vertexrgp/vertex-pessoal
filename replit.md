# Vertex Finance OS

## Overview

Full-stack personal finance management system built as a premium fintech product. React + Vite frontend with an Express backend and PostgreSQL database.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`drizzle-zod` on DB layer; plain validation in API routes)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Dates**: date-fns (Portuguese)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (all routes)
│   └── vertex-finance/     # React + Vite frontend
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/seed.ts         # Database seed script (mock financial data)
└── ...
```

## Database Schema

Tables:
- `accounts` — bank accounts (checking, savings, investment, wallet, other)
- `categories` — transaction categories with group (fixed/variable/leisure/investment)
- `subcategories` — subcategories linked to categories
- `transactions` — financial transactions (income/expense/transfer) with full metadata; includes `creditCardId`, `creditType`, `installmentNumber`, `totalInstallments`, `groupId`
- `credit_cards` — credit card records (name, bank, bandeira, limit, fechamento/vencimento day, color)
- `monthly_plans` — monthly planning by category
- `assets` — investment portfolio entries
- `receivables` — money to be received
- `debts` — outstanding debts and loans
- `incomes` — recurring income sources
- `budget_groups` — budget group types (6 groups)
- `budget_items` — line items within budget groups with planned vs realized amounts

## Modules

1. **Dashboard** — 8 summary cards + bar chart (income vs expenses) + donut chart (by category)
2. **Lançamentos** — Full transaction ledger with filters, search, CRUD + duplicate + parcelamentos (installments with group delete)
3. **Cartões** — Credit card management with visual card selector, fatura (billing cycle) dashboard, limit utilization, installment badges, next 3 invoices forecast, CRUD modal with color picker. Route: `/credit-cards`
4. **Planejamento Mensal** — Monthly view by category with planned vs actual
5. **Patrimônio** — 4 tabs: Investimentos, Recebíveis, Dívidas, Fontes de Renda
6. **Orçamento** — Budget groups with progress bars and status indicators
7. **Relatórios** — 4 report types: by category, monthly evolution, top expenses, planned vs realized
8. **Configurações** — Category and account management

## API Routes

All routes under `/api`:
- `/accounts` — CRUD
- `/categories`, `/subcategories` — CRUD
- `/transactions` — CRUD + duplicate + filters (month, year, category, account, type, search)
- `/monthly-plans` — CRUD + filter by year
- `/assets`, `/receivables`, `/debts`, `/incomes` — CRUD
- `/budget-groups`, `/budget-items` — CRUD
- `/dashboard/summary` — aggregated summary for given month/year
- `/dashboard/monthly-chart` — 12-month income/expense chart data
- `/dashboard/category-chart` — expense breakdown by category
- `/reports/expenses-by-category` — report data
- `/reports/monthly-evolution` — cumulative evolution
- `/reports/top-expenses` — top N expenses
- `/reports/planned-vs-realized` — budget comparison
- `/credit-cards` — CRUD + fatura endpoint (`GET /credit-cards/:id/fatura?month&year`)
- `/transactions/installments` — create installment series; `DELETE /transactions/group/:groupId`

## Development Commands

- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push schema changes to database
- `pnpm --filter @workspace/scripts run seed` — seed the database with mock financial data

## Future Roadmap (not yet built)

- Financial goals module
- ~~Credit card tracking~~ ✅ Done
- Recurring subscription management
- Bank statement import (CSV/OFX)
- Multi-user / SaaS
- AI-powered financial insights
- Replit Auth integration
