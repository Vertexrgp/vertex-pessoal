# VERTEX OS — Master Document

> Documento de referência para visão, arquitetura e regras do sistema.
> Atualizado em: março de 2026

---

## 1. Visão do Produto

### O que é o Vertex OS

O Vertex OS é um sistema operacional financeiro pessoal — uma plataforma modular e premium para gestão completa da vida financeira, patrimonial, de performance pessoal, agenda e viagens.

O nome reflete a ideia de um ponto central de controle: o vértice de onde todas as decisões importantes da vida partem com clareza e dados.

### Objetivo do Sistema

Dar ao usuário visibilidade total sobre sua situação financeira e pessoal, permitindo que ele:

- Entenda onde está hoje (diagnóstico)
- Simule decisões antes de tomá-las (simulação)
- Planeje onde quer chegar (projeção)
- Acompanhe a evolução ao longo do tempo (performance)

O sistema não é uma simples planilha nem um app de controle de gastos. É uma plataforma de tomada de decisão com visual premium e inteligência integrada.

### Público

- Profissionais liberais e executivos que querem controle financeiro real
- Pessoas com patrimônio acumulado que precisam de visibilidade organizada
- Usuários que tomam decisões financeiras relevantes mensalmente
- Perfil: 28–50 anos, renda média-alta, interesse em organização e planejamento

---

## 2. Arquitetura do Sistema

### Conceito: Sistema Único Modular

O Vertex OS é construído como um sistema único com módulos independentes. Cada módulo cobre um domínio da vida do usuário e pode ser desenvolvido, expandido e eventualmente separado sem impactar os demais.

```
Vertex OS
├── Módulo Financeiro       ← em desenvolvimento
├── Módulo Performance      ← próximo
├── Módulo Agenda           ← planejado
└── Módulo Viagens          ← planejado
```

### Módulos

#### Módulo Financeiro
Cobre toda a gestão financeira pessoal:
- Lançamentos (receitas e despesas)
- Planejamento Mensal (previsão de saldo)
- Recorrências (despesas e receitas fixas)
- Custo de Vida (essencial, modo enxuto, modo otimização)
- Simulador Financeiro (cenários de decisão)
- Orçamento
- Relatórios
- Patrimônio (ativos, recebíveis, dívidas, rendas)
- Cartões (faturas, cadastro)

#### Módulo Performance
Acompanhamento de metas pessoais, hábitos e indicadores de produtividade e bem-estar.

#### Módulo Agenda
Gestão de compromissos, eventos relevantes e planejamento de calendário vinculado a eventos financeiros.

#### Módulo Viagens
Planejamento e controle de viagens: roteiros, orçamento de viagem, despesas em trânsito e moeda estrangeira.

---

## 3. Princípios de Desenvolvimento

### Independência de Módulos
Cada módulo deve ser desenvolvido de forma que:
- Não dependa de dados de outro módulo para funcionar
- Possa ser desativado sem quebrar os demais
- Tenha suas próprias rotas, páginas e componentes

### Evitar Acoplamento
- Componentes compartilhados ficam em `src/components/`
- Lógica de negócio de um módulo não deve vazar para outro
- Integrações entre módulos devem ser explícitas e documentadas

### Banco de Dados Organizado por Domínio
As tabelas do banco seguem o domínio de cada módulo:

| Domínio       | Tabelas                                                        |
|---------------|----------------------------------------------------------------|
| Financeiro    | transactions, categories, accounts, recurring_transactions, annual_plans, assets, receivables, debts, incomes, credit_cards, invoices, budget_items |
| Performance   | (futuro) goals, habits, metrics                               |
| Agenda        | (futuro) events, reminders                                    |
| Viagens       | (futuro) trips, trip_expenses, itineraries                    |

### Preparado para Produto
O sistema é construído como se fosse virar um produto SaaS. Isso implica:
- Código limpo e bem organizado
- Visual premium e consistente
- Experiência de uso fluida e intuitiva
- Dados reais, sem mocks ou placeholders
- Erros explícitos, sem falhas silenciosas

---

## 4. Estrutura Técnica

### Stack

| Camada       | Tecnologia                        |
|--------------|-----------------------------------|
| Frontend     | React 18 + Vite + TypeScript      |
| Estilo       | Tailwind CSS + shadcn/ui          |
| Roteamento   | Wouter                            |
| Estado       | TanStack Query (React Query)      |
| Backend      | Express.js + TypeScript           |
| Banco        | PostgreSQL                        |
| ORM          | Drizzle ORM                       |
| Monorepo     | pnpm workspaces                   |

### Estrutura de Diretórios

```
workspace/
├── artifacts/
│   ├── vertex-finance/          ← Frontend React
│   │   └── src/
│   │       ├── pages/           ← Uma página por módulo/rota
│   │       ├── components/
│   │       │   ├── layout/      ← Sidebar, AppLayout
│   │       │   └── ui/          ← Componentes shadcn
│   │       ├── lib/             ← Utilitários (format, utils)
│   │       └── App.tsx          ← Roteamento principal
│   └── api-server/              ← Backend Express
│       └── src/
│           ├── routes/          ← Um arquivo por domínio de rota
│           └── index.ts         ← Entrada do servidor
└── lib/
    └── db/
        └── src/
            └── schema/          ← Schema Drizzle por tabela
```

### Rotas do Frontend

| Rota                    | Página                    | Módulo      |
|-------------------------|---------------------------|-------------|
| `/`                     | Dashboard                 | Financeiro  |
| `/transactions`         | Lançamentos               | Financeiro  |
| `/monthly-planning`     | Planejamento Mensal       | Financeiro  |
| `/recorrencias`         | Recorrências              | Financeiro  |
| `/custo-de-vida`        | Custo de Vida             | Financeiro  |
| `/simulador-financeiro` | Simulador Financeiro      | Financeiro  |
| `/budget`               | Orçamento                 | Financeiro  |
| `/reports`              | Relatórios                | Financeiro  |
| `/patrimonio`           | Patrimônio — Visão Geral  | Financeiro  |
| `/receivables`          | Recebíveis                | Financeiro  |
| `/debts`                | Dívidas                   | Financeiro  |
| `/incomes`              | Rendas                    | Financeiro  |
| `/faturas`              | Faturas                   | Financeiro  |
| `/cartoes`              | Cartões Cadastrados       | Financeiro  |
| `/settings`             | Configurações             | Sistema     |

### Rotas da API

| Método | Rota                              | Descrição                          |
|--------|-----------------------------------|------------------------------------|
| GET    | `/api/transactions`               | Lista lançamentos com filtros      |
| POST   | `/api/transactions`               | Cria lançamento                    |
| PUT    | `/api/transactions/:id`           | Atualiza lançamento                |
| DELETE | `/api/transactions/:id`           | Remove lançamento                  |
| GET    | `/api/categories`                 | Lista categorias                   |
| GET    | `/api/accounts`                   | Lista contas                       |
| GET    | `/api/recurring`                  | Lista recorrências                 |
| POST   | `/api/recurring`                  | Cria recorrência                   |
| PUT    | `/api/recurring/:id`              | Atualiza recorrência               |
| PATCH  | `/api/recurring/:id/toggle`       | Ativa/desativa recorrência         |
| DELETE | `/api/recurring/:id`              | Remove recorrência                 |
| GET    | `/api/annual-plans`               | Planejamento anual com previsão    |
| PUT    | `/api/annual-plans/:year/:month`  | Atualiza mês do planejamento       |
| GET    | `/api/custo-de-vida`              | Dados consolidados de custo de vida|
| GET    | `/api/assets`                     | Lista ativos patrimoniais          |
| GET    | `/api/budget`                     | Dados de orçamento                 |

### Convenções de Código

- Linguagem da interface: **Português Brasileiro**
- Moeda: **BRL**, formato `R$ 1.234,56`
- Datas: `DD/MM/YYYY`
- Nomes de arquivos: `kebab-case.tsx`
- Componentes React: `PascalCase`
- Validação no backend: funções JS simples (sem zod v4 — incompatível com esbuild)
- Sem mocks: todos os dados vêm do banco real
- Erros explícitos: nunca retornar dados silenciosos em caso de falha

### Design System

| Elemento         | Valor                            |
|------------------|----------------------------------|
| Cor primária     | `#6366F1` (indigo)               |
| Fonte            | Inter                            |
| Bordas           | `rounded-2xl` como padrão        |
| Cards            | `bg-white border border-slate-200 rounded-2xl shadow-sm` |
| Estilo geral     | Fintech premium, minimal, light  |
| Tema             | Light only (sem dark mode)       |

---

## 5. Estratégia Futura

### Separação de Módulos
Quando o sistema crescer, cada módulo pode virar um produto independente:

- `vertex-finance.app` — Gestão financeira
- `vertex-perform.app` — Performance pessoal
- `vertex-travel.app` — Viagens

A arquitetura atual já prevê essa separação através do isolamento de rotas, schemas e lógica por domínio.

### Feature Flags
Preparar o sistema para ativar/desativar módulos por usuário ou plano:

```ts
// Exemplo futuro
const features = {
  simulador: true,
  modulo_performance: false,
  modulo_viagens: false,
};
```

### Planos Pagos (futuro)
Estrutura de planos planejada:

| Plano       | Acesso                                      |
|-------------|---------------------------------------------|
| Gratuito    | Lançamentos, orçamento básico               |
| Pro         | Todos os módulos financeiros + simulador    |
| Premium     | Todos os módulos + performance + agenda     |
| Elite       | Tudo + módulo de viagens + IA integrada     |

### Inteligência Artificial
O simulador e os módulos de planejamento estão arquitetados para receber sugestões de IA no futuro:
- Sugestão automática de cortes
- Projeções de longo prazo com variáveis de mercado
- Alertas preditivos de risco financeiro
- Comparação anônima com perfis similares

---

## 6. Roadmap

### Módulo Financeiro — Em Desenvolvimento ✅

**Concluído:**
- [x] Lançamentos (CRUD completo)
- [x] Categorias e contas
- [x] Planejamento Mensal com previsão de saldo
- [x] Recorrências (CRUD + toggle + classificação por tipo de custo)
- [x] Custo de Vida (Visão Atual + Modo Enxuto + Modo Otimização)
- [x] Simulador Financeiro (8 tipos de simulação + cenários rápidos + gráfico 12 meses)
- [x] Patrimônio (ativos, recebíveis, dívidas, rendas)
- [x] Cartões e Faturas

**Em andamento / Próximo no Financeiro:**
- [ ] Orçamento (budget por categoria com acompanhamento)
- [ ] Relatórios (gráficos históricos de receita/despesa/patrimônio)
- [ ] Configurações (categorias customizadas, contas, perfil)
- [ ] Dashboard aprimorado (resumo executivo com alertas)
- [ ] Exportação de dados (PDF / CSV)
- [ ] Metas financeiras com acompanhamento de progresso
- [ ] Integração bancária (OFX / Open Finance)

### Módulo Performance — Próximo 🔜

**Planejado:**
- [ ] Metas pessoais (saúde, carreira, aprendizado)
- [ ] Hábitos diários com streak
- [ ] Indicadores de produtividade
- [ ] Dashboard de performance semanal/mensal
- [ ] Conexão com metas financeiras

### Módulo Agenda — Planejado 📅

**Planejado:**
- [ ] Calendário de compromissos
- [ ] Eventos vinculados a lançamentos financeiros
- [ ] Lembretes de vencimentos e datas importantes
- [ ] Visão semanal e mensal

### Módulo Viagens — Planejado ✈️

**Planejado:**
- [ ] Cadastro de viagens
- [ ] Orçamento de viagem
- [ ] Despesas em moeda estrangeira com conversão
- [ ] Roteiro e checklist
- [ ] Histórico de viagens com custo total

---

## 7. Regras para Continuidade do Desenvolvimento

### Para qualquer desenvolvedor (humano ou IA) que continuar este projeto:

1. **Não altere dados reais com mocks.** Todos os dados exibidos vêm do banco PostgreSQL real.

2. **Não use zod v4** no api-server. O esbuild não resolve o pacote corretamente. Use validações com funções JS simples.

3. **Não mude o tipo das colunas de ID** nas tabelas existentes. `serial` deve continuar `serial`.

4. **Para mudanças no schema**, rode `pnpm --filter @workspace/db run push` após editar os arquivos em `lib/db/src/schema/`.

5. **O servidor da API roda na porta 8080.** O frontend usa `BASE_URL` do Vite para prefixar todas as chamadas à API.

6. **Toda interface é em Português Brasileiro.** Não adicionar strings em inglês na UI.

7. **O design é premium e minimal.** Não adicionar elementos que pareçam planilha. Sempre usar `rounded-2xl`, tipografia clara e espaçamento generoso.

8. **Simulações não alteram dados reais.** O Simulador Financeiro é totalmente client-side e não persiste nada.

9. **Cada módulo novo deve ser adicionado** à sidebar em `Sidebar.tsx`, às rotas em `App.tsx` e ter sua própria página em `src/pages/`.

10. **Atualize o `replit.md`** ao fazer mudanças arquiteturais significativas.

---

*Documento mantido como fonte de verdade do projeto Vertex OS.*
