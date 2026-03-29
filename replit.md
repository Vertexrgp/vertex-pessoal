# Vertex OS

## Overview

Full-stack personal OS — 8 modules: Financeiro (incl. Cartões + Patrimônio), Performance, Agenda, Viagens, Crescimento, Conhecimento, Idiomas, Planejamento de Vida. Premium SaaS product built with React + Vite frontend, Express backend, and PostgreSQL database. All UI in Brazilian Portuguese. Collapsible sidebar with compact (icon-only) mode and cross-module event bus.

## Planejamento de Vida Module

- **Routes**: `/vida` → project list; `/vida/:id` → project detail; `/vida/:projetoId/cidades/:cidadeId` → city detail
- **Sidebar**: "PLANEJAMENTO DE VIDA" section with Compass icon, violet accent (`text-violet-400`)
- **DB Tables** (8): `vida_projetos`, `vida_cidades`, `vida_custo_vida`, `vida_pros_contras`, `vida_plano_acao`, `vida_checkpoints`, `vida_trabalho`, `vida_visto`, `vida_qualidade`, `vida_score_pesos`
- **City detail page** (`cidade-detalhe.tsx`) with 6 tabs:
  - **Geral**: nome, pais, estado, moeda, idiomas, fuso, clima, prioridade, scores 1-10
  - **Custo de Vida**: 12 fields grouped (moradia/alimentação/mobilidade/outros), shows total mensal + anual
  - **Trabalho & Renda**: renda Rafael/Fernanda, faixas (conservadora/provável/otimista), demanda, idioma, validação, facilidade recolocação 1-10, saldo calculado
  - **Visto & Imigração**: tipo visto, dificuldades (estudo/trabalho/permanente) 1-10, tempo estimado, custo, job offer, nota viabilidade 1-10
  - **Qualidade de Vida**: 9 scored criteria with icon+description, média geral shown
  - **Prós & Riscos**: add/delete items for prós, contras, riscos, dúvidas
- **Project detail page** (`projeto-detalhe.tsx`) with 6 tabs:
  - **Cidades**: summary cards with custo/saldo/score + prós/contras badges + "Editar análise completa" link → cidade detail
  - **Comparação**: full table comparing all cities on 9 criteria with color coding (best=green, worst=red)
  - **Simulação**: city selector, renda (pre-filled from faixaProvável), economias, calculates saldo/reserva/meses
  - **Plano de Ação**: checklist with cycle status (click circle), inline edit, prazo, progress bar
  - **Checkpoints**: timeline with check-to-complete, dataAlvo, delete on hover
  - **Resumo de Decisão**: score ranking with bar chart, editable peso weights, auto-diagnostics (cheapest/best renda/best balance/easiest visto), decision panel table with traffic lights
- **Score algorithm**: composite weighted score using pesoCusto/pesoRenda/pesoImigracao/pesoSeguranca/pesoAdaptacao/pesoQualidade; custo inversely scored (cheaper=better); stored in `vida_score_pesos` per project
- **API**: Full CRUD for all 8 tables + `PUT /api/vida/projetos/:id/score-pesos` + `GET /api/vida/cidades/:id` (full city detail)

## Agenda — Planejamento Semanal

- **scheduledDate date picker**: `MiniCalendar` component (above trigger, PT locale, "Remover data" button)
- **Time fields**: `startTime`/`endTime` per task (displayed as chip on TaskRow)
- **Recurrence system**: `agenda_recurring_series` table + lazy 26-week generation; types: daily, weekdays, weekly (interval), monthly, custom (DOW pills) + end date
- **RecurringActionDialog**: single / future / all edit & delete modes
- **Recurrence badge** (↻) on recurring TaskRows; `isRecurringException` for single edits
- **editMode**: `single` marks `isRecurringException=true`; `future` bulk-updates from date forward; `all` updates all + series record
- **deleteMode**: `single` removes one instance; `all` deletes entire series + all instances
- **Continuous scroll timeline**: replaced week-navigation with infinite vertical scroll
  - `loadedWeeks` state: starts with 1 week before + current + 4 weeks ahead (5 weeks total)
  - `useQueries` (parallel per week): each week fetched independently, cached by Monday date string
  - `allTasks` = flat merge of all week queries (deduplicated by ID)
  - `DayBlock.droppableId` = date string (e.g. `"2026-03-29"`) — unique across all weeks
  - DnD `findContainer` maps task IDs to their `scheduledDate` date string (or `"pool"`)
  - `InfiniteScrollSentinel`: IntersectionObserver appends 2 more weeks at bottom automatically
  - `WeekHeader`: sticky header per week group; current week highlighted with "SEMANA ATUAL" badge
  - `todayBlockRef` + `useEffect`: auto-scrolls to today's DayBlock on first render
  - "Ir para hoje" button: `scrollIntoView({ behavior: "smooth" })` to today's block
  - Cache helpers: `updateTaskInCache`, `removeTaskFromCache`, `addTaskToCache`, `invalidateAllWeeks`

## Conhecimento Module (Premium)

- **Hub page** (`/conhecimento`): Biblioteca Pessoal com busca global, filtros por tipo e status, e smart blocks (Favoritos, Em andamento, Na fila, Concluídos)
- **Livros** (`/conhecimento/livros`): Grid visual de livros com capa, progresso, favorito toggle, busca + filtros
  - **Upload de capa**: FileReader converte arquivo (JPG/PNG/WebP) em base64 data URL, armazenado na coluna `capa text`
  - **Progresso por páginas**: campo `currentPage integer` em `conhecimento_livros`; progresso (%) calculado automaticamente de currentPage/totalPaginas
  - **Frases & Trechos** (tab renomeada de "Frases"): dois modos — "Digitar" e "Foto da página" com OCR por IA
  - **OCR**: POST `/api/conhecimento/ocr` — envia base64 para OpenAI gpt-4o vision → retorna texto extraído para revisão antes de salvar
  - **frasesApi**: campos adicionados `imagemUrl text` e `favorito boolean` em `conhecimento_frases`; PATCH `/frases/:id/favorito`
- **Artigos** (`/conhecimento/artigos`): Lista com favoritos, busca, filtros por tema
- **Vídeos** (`/conhecimento/videos`): Grid com thumbnail, plataforma badge, favoritos, busca, filtros
- **Favoritos**: campo `favorito boolean` em todos os três; PATCH toggle endpoint; coração em cada card
- **Schema**: `favorito` boolean em `conhecimento_livros`, `conhecimento_artigos`, `conhecimento_videos`
- **IA (OCR)**: OpenAI integração via Replit AI Integrations (env vars: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`); modelo `gpt-4o` para visão

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
- `agenda_planner_tasks` — weekly planner tasks; `scheduledDate` (date) = specific calendar date for a task; `diaSemana` (text) = legacy day-of-week (kept for backward compat); API auto-derives `semanaInicio` and `diaSemana` from `scheduledDate` when provided

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

## Production Setup

### Centralized API URL

- `artifacts/vertex-finance/src/lib/api-base.ts` — single source of truth for API base URL
- Priority: `VITE_API_URL` env var (production) → fallback to BASE_URL derivation (Replit dev)
- All 30 page/lib files import from this utility — no more inline function duplication

### Environment Variables

**Frontend** (`artifacts/vertex-finance/.env.example`):
- `VITE_API_URL` — API server URL in production (e.g., `https://api.vertexos.com`)

**Backend** (`artifacts/api-server/.env.example`):
- `DATABASE_URL` — PostgreSQL connection string (required)
- `PORT` — server port (default: 8080)
- `CORS_ORIGINS` — comma-separated allowed origins for CORS (production security)
- `NODE_ENV` — set to `production` for production

### Health Check

`GET /health` → `{ status: "ok", ts: "ISO-timestamp" }`

### Deploy Guide

See `DEPLOY.md` for complete step-by-step deployment instructions.

### Deploy Configs

- `vercel.json` — Vercel build config (output dir, SPA rewrites, BASE_PATH)
- `railway.json` — Railway build + start commands + healthcheck

## Future Roadmap (not yet built)

- Financial goals module
- ~~Credit card tracking~~ ✅ Done
- Recurring subscription management
- Bank statement import (CSV/OFX)
- Multi-user / SaaS
- AI-powered financial insights
- Replit Auth integration
