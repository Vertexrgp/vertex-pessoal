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