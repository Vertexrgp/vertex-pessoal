# Vertex OS

## Overview

Vertex OS is a full-stack personal operating system designed as a premium SaaS product. It integrates eight core modules: Financeiro (Financial, including Credit Cards and Net Worth), Performance, Agenda (Calendar), Viagens (Travel), Crescimento (Growth), Conhecimento (Knowledge), Idiomas (Languages), and Planejamento de Vida (Life Planning). The platform aims to provide a comprehensive tool for personal management, focusing on detailed tracking, planning, and insights across various aspects of a user's life. It is built with a React + Vite frontend, Express backend, and PostgreSQL database, with all UI in Brazilian Portuguese, featuring a collapsible sidebar and a cross-module event bus for seamless interaction.

## User Preferences

I want iterative development.
I want detailed explanations.
Ask before making major changes.

## System Architecture

The system is built as a monorepo using pnpm workspaces. The frontend uses React with Vite, Tailwind CSS, and shadcn/ui for a modern and responsive user interface, adhering to a Brazilian Portuguese localization. The backend is an Express 5 API server, communicating with a PostgreSQL database managed by Drizzle ORM. Zod is used for validation across both API routes and the database layer. API client code is generated using Orval from an OpenAPI specification.

**Core UI/UX Decisions:**
- **Language**: All UI elements are in Brazilian Portuguese.
- **Navigation**: Features a collapsible sidebar with a compact (icon-only) mode.
- **Styling**: Utilizes Tailwind CSS and shadcn/ui components for a consistent design. Color schemes and accent colors (e.g., violet accent for "Planejamento de Vida") are used to differentiate modules.
- **Date Handling**: `date-fns` is used for date manipulations, ensuring Portuguese localization.

**Technical Implementations & Feature Specifications:**

*   **Global**: Cross-module event bus for inter-module communication.
*   **AI Integration**: Anthropic Claude claude-sonnet-4-6 with vision capability via Replit AI Integrations proxy. Used in the Performance > Análise Corporal IA module. Client configured in `lib/integrations-anthropic-ai/src/client.ts`.
*   **Object Storage**: Replit GCS-backed object storage for photo uploads. Presigned URL upload flow: POST `/api/storage/uploads/request-url` → PUT to GCS → save `objectPath` in DB. Images served via GET `/api/storage/objects/*path`. Minimum image size filter (500 bytes) applied before sending to AI.
*   **Performance Module — Análise Corporal IA**:
    *   New page at `/performance/analise-corporal` with Claude claude-sonnet-4-6 vision analysis.
    *   Analyzes current body photos (frente/lado/costas) + reference photos + numeric data (peso/gordura atual/alvo).
    *   Returns structured JSON: corpoAtual, corpoDesejado, comparacao, prioridades (5 groups), estrategia (cutting/bulking/recomposicao/ganho_controlado/reducao_massa), treino (with weekly division), observacoes.
    *   DB table: `performance_corpo_analise` (JSONB columns for all sections).
    *   API: GET/POST `/api/performance/corpo-analise`. Image download via GCS SDK `file.download()`.
    *   Falls back to text-only analysis when photos are absent or too small.
*   **Performance Module — Sistema de Treino**:
    *   Complete workout system at `/performance/treinos` with 4-tab UI.
    *   **Plano** tab: AI-generated weekly plan using Claude + body analysis priorities. Weekly calendar view + collapsible day cards showing exercises, sets, reps, rest.
    *   **Hoje** tab: Select a workout day to start a timed session. Pre-populates sets from plan. Exercise set logger with weight + reps inputs + completion toggle.
    *   **Histórico** tab: Past sessions list grouped by period with summary stats.
    *   **Progressão** tab: Line chart of max load per exercise over time. Auto-progression suggestions (increase/maintain/reduce load).
    *   DB tables: `performance_exercise_db` (47 seeded exercises), `performance_workout_plan`, `performance_workout_day`, `performance_workout_day_exercise`, `performance_workout_log`, `performance_workout_set_log`.
    *   API routes in `treino-sistema.ts`: exercises, seed, plan CRUD, plan/generate (AI), logs CRUD, sets PATCH, progressao GET, sugestoes-progressao GET.
    *   AI plan uses body analysis prioridades to assign exercise volume: primário=4 séries, secundário=3, manutenção=2-3.
    *   Auto-progression: suggests load increase when user hits top of rep range consistently.
*   **Performance Module — Objetivo Físico**:
    *   Photo upload via GCS presigned URL flow (replaces base64).
    *   DB: `performanceBodyPhotosTable` with `objectPath` column, `imageData` nullable (legacy).
    *   `imageUrl` computed server-side via `resolveImageUrl()` helper in `/api/performance/body-photos`.
*   **Planejamento de Vida Module**:
    *   Manages life projects and city analyses with detailed financial, immigration, quality of life, and pros/cons assessments.
    *   Features a sophisticated weighted scoring algorithm for comparing cities based on user-defined criteria.
    *   Includes action plans with progress tracking and decision summary tools with auto-diagnostics.
    *   DB tables: `vida_projetos`, `vida_cidades`, `vida_custo_vida`, `vida_pros_contras`, `vida_plano_acao`, `vida_checkpoints`, `vida_trabalho`, `vida_visto`, `vida_qualidade`, `vida_score_pesos`.
*   **Agenda Module**:
    *   Weekly planner with time-based tasks and a robust recurrence system (daily, weekdays, weekly, monthly, custom).
    *   Supports single, future, or all instance edits/deletes for recurring tasks, marked by `isRecurringException`.
    *   Features an infinite vertical scroll timeline with lazy loading of weeks and auto-scrolling to the current day.
    *   DB tables: `agenda_planner_tasks`, `agenda_recurring_series`.
*   **Conhecimento Module (Premium)**:
    *   Personal Library hub for books, articles, and videos with global search, filters, and smart blocks (favorites, in progress, etc.).
    *   **Books**: Visual grid with cover uploads (base64 storage), progress tracking by pages, and a "Frases & Trechos" section featuring AI-powered OCR for extracting text from page photos using OpenAI's `gpt-4o` vision model.
    *   DB tables: `conhecimento_livros`, `conhecimento_artigos`, `conhecimento_videos`, `conhecimento_frases`.
*   **Financeiro Module**:
    *   Comprehensive financial tracking including transactions (with installment series), monthly planning, budgeting, and detailed reports.
    *   Manages credit cards with fatura (invoice) views, limits, and next invoice forecasts.
    *   Consolidated net worth overview with sections for investments, receivables, debts, and incomes.
    *   DB tables: `accounts`, `categories`, `subcategories`, `transactions`, `credit_cards`, `monthly_plans`, `assets`, `receivables`, `debts`, `incomes`, `budget_groups`, `budget_items`.
*   **Performance Module**:
    *   Tracks physical performance goals, body measurements, lab exams (with detailed markers and evolution charts), protocols (medication/supplements), workouts, nutrition plans, and weekly progress.
    *   Features visual body comparison tools and auto-calculated gaps to goals.
    *   DB tables: `performance_goals`, `performance_body_goal`, `performance_body_photos`, `performance_current_state`, `performance_exams`, `performance_exam_markers`, `performance_protocols`, `performance_workouts`, `performance_nutrition`, `performance_progress`, `performance_meal_plans`, `performance_meals`.
*   **Idiomas Module**:
    *   Manages language learning configurations, study sessions, and vocabulary tracking.
    *   DB tables: `idioma_config`, `idioma_sessoes`, `idioma_vocabulario`.

## Stripe Paywall

*   **Integration**: Replit native Stripe connector (`connector:ccfg_stripe_01K611P4YQR0SZM11XFRQJC44Y`) via the integrations system. Uses Replit's credential API (`REPLIT_CONNECTORS_HOSTNAME` + `REPL_IDENTITY`) — no manual `STRIPE_SECRET_KEY` env var needed.
*   **Client**: `artifacts/api-server/src/stripeClient.ts` — `getUncachableStripeClient()`, `getStripeSync()`, `getStripeSecretKey()` — fetches live credentials from Replit connector API on every call.
*   **Packages**: `stripe ^22.0.0` + `stripe-replit-sync ^1.0.0` at workspace root (`package.json`).
*   **DB**: `stripe-replit-sync` auto-creates `stripe` schema with 29 tables (products, prices, subscriptions, customers, etc.) via `runMigrations({ databaseUrl })`. Run once on startup; tables persist across restarts. Users table has `stripe_customer_id TEXT` + `stripe_subscription_id TEXT` columns.
*   **Startup**: `artifacts/api-server/src/index.ts` — `initStripe()` runs `runMigrations` → `getStripeSync()` → `findOrCreateManagedWebhook(...)` → `syncBackfill()` async.
*   **Webhook**: Registered in `app.ts` BEFORE `express.json()` at `/api/stripe/webhook` with `express.raw()`.
*   **Webhook handler**: `webhookHandlers.ts` — delegates to `stripeSync.processWebhook(payload, sig)`.
*   **API Routes** (`routes/stripe.ts`): GET `/api/stripe/subscription`, GET `/api/stripe/plans`, POST `/api/stripe/create-checkout-session`, POST `/api/stripe/portal`. All require `requireAuth`.
*   **Products**: Created via `scripts/src/seed-products.ts`. Products in Stripe sandbox:
    - `Vertex OS Pro` → `prod_UHuqvJsKWOobEH`, price `price_1TJL0wPnrfebdemuCKhCB6hK` (R$19,90/mês)
    - `Vertex OS Premium` → `prod_UHuqJKQN0umgZt`, price `price_1TJL0xPnrfebdemuNX4y7I0W` (R$39,90/mês)
*   **Env vars**: `STRIPE_PRICE_PRO` + `STRIPE_PRICE_PREMIUM` set in shared env. Fetched by `/api/stripe/plans` endpoint.
*   **Frontend**: `/pricing` page (`artifacts/vertex-finance/src/pages/pricing/index.tsx`) with 3-tier cards (Free/Pro/Premium). `useSubscription` hook (`hooks/useSubscription.ts`) fetches plan from `/api/stripe/subscription`. Sidebar `UserPanel` shows plan badge (Free/Pro/Premium) with color + icon, plus "Upgrade →" link for Free users.
*   **Plans storage**: `stripe-replit-sync` queryable from `stripe.subscriptions` table. Subscription plan derived from `stripe.products.metadata.vertex_plan` field.
*   **Plan resolution**: `stripeStorage.ts` `resolvePlanFromSubscription()` — checks product metadata `vertex_plan` field, maps to `free|pro|premium`.
*   **NOTE — IMPORTANT**: `runMigrations` must complete BEFORE `getStripeSync()` is called. On first run, stripe schema tables may not exist — restart server if needed after DB initialization.

## Authentication & Multi-tenancy

*   **Auth System**: JWT-based cookie authentication (httpOnly cookie `auth_token`, 30-day expiry).
*   **Auth Flow**: Register → `bcryptjs` hash → insert `users` table → sign JWT → set cookie. Login → verify hash → sign JWT → set cookie. All routes under `/api/*` except `/api/health`, `/api/auth/*` require the cookie.
*   **Middleware**: `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth` middleware parses cookie manually (no cookie-parser dependency), verifies JWT, attaches `req.user = { id, email, name }`.
*   **Auth Routes**: `artifacts/api-server/src/routes/auth.ts` — POST `/api/auth/register`, POST `/api/auth/login`, POST `/api/auth/logout`, GET `/api/auth/me`.
*   **DB**: `users` table in `lib/db/src/schema/auth.ts` (id, name, email, password_hash, timestamps).
*   **Multi-tenancy**: Every root-level table across all 14 schema files has a `user_id INTEGER NOT NULL DEFAULT 1` column, enabling full per-user data isolation. First registered user gets id=1 and owns all seeded data.
*   **Frontend Auth**: `artifacts/vertex-finance/src/contexts/AuthContext.tsx` — `AuthProvider` wraps the entire app, `useAuth()` hook provides `user`, `login()`, `register()`, `logout()`. `AuthGate` component in `App.tsx` redirects unauthenticated users to `/login`. Sidebar shows user info (initials + name + email) with a logout button.
*   **Packages**: `bcryptjs`, `jsonwebtoken`, `cookie-parser` (+ types) installed in `artifacts/api-server`.
*   **JWT Secret**: `process.env.JWT_SECRET || "vertex-os-jwt-secret-2026"`. Set `JWT_SECRET` env var in production.

## External Dependencies

*   **Database**: PostgreSQL
*   **ORM**: Drizzle ORM
*   **API Framework**: Express 5
*   **Frontend Framework**: React
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS, shadcn/ui
*   **Charts**: Recharts
*   **Forms**: React Hook Form
*   **Validation**: Zod
*   **Date Utility**: date-fns
*   **API Codegen**: Orval
*   **AI Integrations**: OpenAI (specifically `gpt-4o` for vision tasks like OCR in the Conhecimento module, accessed via Replit AI Integrations).
*   **Deployment Platforms**: Vercel (frontend), Railway (backend) - indicated by their respective configuration files (`vercel.json`, `railway.json`).