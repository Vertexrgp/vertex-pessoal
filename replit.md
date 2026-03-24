# Vertex OS

## Overview

Full-stack personal OS — 7 modules: Financeiro (incl. Cartões + Patrimônio), Performance, Agenda, Viagens, Crescimento, Conhecimento, Idiomas. Premium SaaS product built with React + Vite frontend, Express backend, and PostgreSQL database. All UI in Brazilian Portuguese. Collapsible sidebar with compact (icon-only) mode and cross-module event bus.

## Conhecimento Module (Premium)

- **Hub page** (`/conhecimento`): Biblioteca Pessoal com busca global, filtros por tipo e status, e smart blocks (Favoritos, Em andamento, Na fila, Concluídos)
- **Livros** (`/conhecimento/livros`): Grid visual de livros com capa, progresso, favorito toggle, busca + filtros
- **Artigos** (`/conhecimento/artigos`): Lista com favoritos, busca, filtros por tema
- **Vídeos** (`/conhecimento/videos`): Grid com thumbnail, plataforma badge, favoritos, busca, filtros
- **Favoritos**: campo `favorito boolean` em todos os três; PATCH toggle endpoint; coração em cada card
- **Schema**: `favorito` boolean em `conhecimento_livros`, `conhecimento_artigos`, `conhecimento_videos`

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
- `performance_goals` — physical objectives (target weight, BF%, aesthetic goal, deadline)
- `performance_current_state` — current physical state (weight, height, BF%, body measurements, photos)
- `performance_exams` — lab exam records (type, date, lab, file URL, results)
- `performance_protocols` — medications/supplements/hormones (dosage, schedule, cycle dates, via)
- `performance_workouts` — workout plans with exercises JSON (name, series, reps, load, rest)
- `performance_nutrition` — nutrition strategy with macros and meals JSON
- `performance_progress` — weekly progress tracking (weight, BF%, waist, energy, mood, photos)
- `idioma_config` — per-language config (nivel_atual, nivel_meta in CEFR scale)
- `idioma_sessoes` — study session records (data, duracao, tipo, concluida, notas)
- `idioma_vocabulario` — vocabulary words (palavra, traducao, nivel, aprendida, notas)

## Navigation Structure (Sidebar)

```
Dashboard (/)

Financeiro
  Lançamentos            /transactions
  Planejamento Mensal    /monthly-planning
  Orçamento              /budget
  Relatórios             /reports

Patrimônio
  Visão Geral            /patrimonio
  Recebíveis             /receivables
  Dívidas                /debts
  Rendas                 /incomes

Cartões
  Faturas                /faturas
  Cartões Cadastrados    /cartoes

Configurações            /settings  (tabs: Contas, Categorias, Cartões, Perfil)
```

## Modules

1. **Dashboard** (`/`) — KPI cards: saldo, receitas, gastos, resultado, patrimônio, dívidas, recebíveis + charts: receitas×gastos mensal, gastos por categoria
2. **Lançamentos** (`/transactions`) — Transaction ledger with filters, search, CRUD + duplicate + installment series (parcelamentos) with group delete. Card selector + installment mode in form.
3. **Planejamento Mensal** (`/monthly-planning`) — Monthly view by category with planned vs actual
4. **Orçamento** (`/budget`) — Budget groups with progress bars and status indicators
5. **Relatórios** (`/reports`) — 4 report types: by category, monthly evolution, top expenses, planned vs realized
6. **Patrimônio Geral** (`/patrimonio`) — Consolidated net worth hero card + 4 section cards (Investimentos, Recebíveis, Dívidas, Rendas) + investment table
7. **Recebíveis** (`/receivables`) — Dedicated receivables list page with status badges
8. **Dívidas** (`/debts`) — Dedicated debts list page with active/paid status
9. **Rendas** (`/incomes`) — Recurring income sources list
10. **Faturas** (`/faturas`) — Credit card fatura view: card selector, month navigation, KPI dashboard (total/pago/aberto/próxima), limit bar, items table with installment badges, next 3 invoices forecast
11. **Cartões Cadastrados** (`/cartoes`) — Card management: visual card grid + detail table + full CRUD modal with color picker
12. **Configurações** (`/settings`) — Tabs: Contas (bank accounts), Categorias (with subcategories), Cartões (redirects to /cartoes), Perfil

Legacy redirects: `/assets` → `/patrimonio`, `/credit-cards` → `/faturas`

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

## Performance Module — Pages

Navigation via `PerformanceLayout.tsx` sub-tabs:

| Page | Path | Description |
|---|---|---|
| Objetivo | `/performance/objetivo` | Define strategic goals (text + targets + deadline + motivation) |
| **Objetivo Físico** | `/performance/objetivo-fisico` | Visual body comparison — reference photos (up to 3), current photos (Frente/Lado/Costas), numeric data (peso/BF atual + alvo + prazo), auto-calculated GAP |
| Avaliação | `/performance/avaliacao` | Body measurements log |
| Exames | `/performance/exames` | Lab exams with 36 markers, evolution bar charts (2-panel layout) |
| Protocolos | `/performance/protocolos` | TRT/medication protocol tracking |
| Treinos | `/performance/treinos` | Workout sessions |
| Nutrição | `/performance/nutricao` | Meal plan (Plano Fev/Mar 2026, Dra. Roberta Carbonari — 5 refeições, 1669kcal/dia) |
| Progresso | `/performance/progresso` | Evolution tracking |
| Recomendações | `/performance/recomendacoes` | Marker analysis — 29 normal / 7 attention items from real exam |

## Performance DB Tables

| Table | Description |
|---|---|
| `performance_goals` | Strategic goals |
| `performance_body_goal` | Numeric data for Objetivo Físico (peso/BF atual+alvo, prazo) |
| `performance_body_photos` | Photos for Objetivo Físico (tipo: objetivo/atual_frente/atual_lado/atual_costas, imageData base64) |
| `performance_current_state` | Body measurement assessments |
| `performance_exams` | Lab exams |
| `performance_exam_markers` | 36 markers from Alta Diagnósticos exam (31/01/2026) |
| `performance_protocols` | TRT/medication protocols |
| `performance_workouts` | Workout sessions |
| `performance_nutrition` | Nutrition log |
| `performance_progress` | Progress tracking |
| `performance_meal_plans` | Meal plans |
| `performance_meals` | Individual meals |

## Real Data Seeded

- **Exam**: Alta Diagnósticos, 31/01/2026, Dr. Paulo Cavalcante Muzy — 36 markers
- **Meal Plan**: Plano Fev/Mar 2026, Dra. Roberta Carbonari — 5 refeições, 1669kcal/dia
- User: Rafael Gomes Perez, DOB 06/05/1991, on TRT protocol

## Future Roadmap (not yet built)

- Financial goals module
- ~~Credit card tracking~~ ✅ Done
- Recurring subscription management
- Bank statement import (CSV/OFX)
- Multi-user / SaaS
- AI-powered financial insights
- Replit Auth integration
