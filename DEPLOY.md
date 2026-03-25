# Guia de Deploy — Vertex OS
> Stack: **Neon** (banco) · **Railway** (backend) · **Vercel** (frontend)

---

## Por que essa stack?

| Serviço | Alternativa | Por que escolher |
|---|---|---|
| **Neon** | Supabase | Só PostgreSQL, sem overhead. Free tier 3 GB. Connection pooling nativo. |
| **Railway** | Render | Sem cold start em uso real. PORT injetado automaticamente. $5/mês Hobby. |
| **Vercel** | Netlify | Melhor DX para React + SPA. CDN global. Gratuito para uso pessoal. |

---

## ORDEM EXATA DO DEPLOY

```
1. Criar banco no Neon
2. Testar conexão local → rodar migrations
3. Deploy backend no Railway
4. Deploy frontend no Vercel (apontando para o backend do Railway)
5. Configurar domínio (opcional)
6. Validação final
```

---

## PASSO 1 — Banco de Dados (Neon)

### 1.1 Criar conta e projeto

1. Acesse **neon.tech** → crie conta gratuita
2. Clique em **New Project**
   - Nome: `vertex-os`
   - Região: `us-east-1` (ou mais próxima)
   - PostgreSQL version: 16
3. Anote a **Connection String** da aba **Connection Details**

### 1.2 Formato da CONNECTION STRING

```
postgresql://usuario:senha@ep-XXXXX.us-east-1.aws.neon.tech/neondb?sslmode=require
```

> Use sempre a string com `?sslmode=require` — o banco rejeita conexões sem SSL.

### 1.3 Para connection pooling (recomendado em produção)

No painel Neon, vá em **Connection Details** → **Pooled connection**:
```
postgresql://usuario:senha@ep-XXXXX-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 1.4 Testar conexão local e rodar migrations

No terminal do Replit (ou local com a DATABASE_URL do Neon):

```bash
# Definir variável temporariamente
export DATABASE_URL="postgresql://..."

# Aplicar schema ao banco Neon
pnpm --filter @workspace/db run push
```

Se `push` completar sem erros, o banco está pronto.

### 1.5 Backup e Restore

**Backup manual (pg_dump):**
```bash
pg_dump "$DATABASE_URL" --format=custom --no-acl --no-owner -f vertex_backup_$(date +%Y%m%d).dump
```

**Restore:**
```bash
pg_restore --no-acl --no-owner -d "$DATABASE_URL" vertex_backup_YYYYMMDD.dump
```

**Backup automático:** Neon mantém histórico de 7 dias com point-in-time recovery no plano gratuito (30 dias no Pro).

---

## PASSO 2 — Backend (Railway)

### 2.1 Criar projeto no Railway

1. Acesse **railway.app** → conta com GitHub
2. **New Project** → **Deploy from GitHub repo**
3. Selecione o repositório do Vertex OS
4. Railway detecta automaticamente o `railway.json` na raiz

### 2.2 Variáveis de ambiente no Railway

Vá em **Settings → Variables** e adicione:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | String de conexão Neon (pooled) |
| `CORS_ORIGINS` | `https://seu-dominio.com` (ou URL do Vercel) |
| `NODE_ENV` | `production` |

> `PORT` é injetado automaticamente pelo Railway — não adicione manualmente.

### 2.3 Configuração de build no Railway

O arquivo `railway.json` já está configurado:
- **Build:** `pnpm --filter @workspace/api-server run build`
- **Start:** `pnpm --filter @workspace/api-server run start`
- **Health check:** `GET /health`

### 2.4 Validar backend

Após o deploy, copie a URL do Railway (ex.: `https://vertex-os-api.railway.app`) e acesse:

```
https://vertex-os-api.railway.app/health
```

Resposta esperada:
```json
{ "status": "ok", "ts": "2026-03-25T12:00:00.000Z" }
```

---

## PASSO 3 — Frontend (Vercel)

### 3.1 Criar projeto no Vercel

1. Acesse **vercel.com** → conta com GitHub
2. **New Project** → selecione o repositório
3. Vercel detecta o `vercel.json` na raiz automaticamente

### 3.2 Variáveis de ambiente no Vercel

Vá em **Settings → Environment Variables** e adicione:

| Variável | Valor |
|---|---|
| `VITE_API_URL` | URL do backend Railway (ex.: `https://vertex-os-api.railway.app`) |

> As variáveis `PORT` e `BASE_PATH` **não precisam ser definidas** no Vercel —
> o sistema usa defaults corretos para produção (`BASE_PATH=/`, `PORT=3000`).

### 3.3 Configuração do `vercel.json`

O arquivo `vercel.json` na raiz já configura:
- **Build:** `pnpm --filter @workspace/vertex-finance run build`
- **Output:** `artifacts/vertex-finance/dist/public`
- **SPA routing:** rewrites para `index.html`
- **BASE_PATH:** `/` (Vercel serve da raiz)

### 3.4 Validar frontend

Acesse a URL do Vercel e verifique:
- Dashboard carrega com dados reais
- Sem erros no console (F12)
- Requisições `fetch` vão para o domínio Railway

---

## PASSO 4 — Domínio próprio (opcional)

### Domínio no Vercel (frontend)

1. **Vercel** → Project → **Settings** → **Domains**
2. Adicione `vertexos.com` (ou `app.vertexos.com`)
3. Aponte o DNS no seu registrador:
   ```
   Tipo: CNAME
   Nome: @  (ou www / app)
   Destino: cname.vercel-dns.com
   ```
4. Aguarde propagação DNS (minutos a horas)

### Domínio no Railway (backend)

1. **Railway** → Service → **Settings** → **Custom Domain**
2. Adicione `api.vertexos.com`
3. Aponte o DNS:
   ```
   Tipo: CNAME
   Nome: api
   Destino: (valor fornecido pelo Railway)
   ```

### Atualizar CORS e VITE_API_URL

Após domínios configurados, atualize:
- Railway → `CORS_ORIGINS=https://vertexos.com`
- Vercel → `VITE_API_URL=https://api.vertexos.com`

Redeploy em ambos os serviços para aplicar.

---

## PASSO 5 — Checklist de Validação Final

### Backend

- [ ] `GET /health` → `{ status: "ok" }`
- [ ] `GET /api/dashboard/global` → retorna dados (não 500)
- [ ] CORS: browser não bloqueia requisições do frontend
- [ ] Logs no Railway sem erros de DB

### Frontend

- [ ] Dashboard carrega sem erros de console
- [ ] Dados financeiros aparecem (Patrimônio, Saldo)
- [ ] Navegação entre módulos funciona (F5 em qualquer rota não retorna 404)
- [ ] **Financeiro**: criar/editar/excluir ativo, dívida, receita
- [ ] **Agenda**: criar evento, ver calendário
- [ ] **Performance**: registrar treino, ver progresso
- [ ] **Crescimento**: vision board abre, criar meta
- [ ] **Viagens**: criar viagem, adicionar despesa
- [ ] **Conhecimento**: adicionar livro, marcar como favorito
- [ ] **Idiomas**: módulo abre sem erros
- [ ] Upload de foto (Objetivo Físico) funciona

### Performance básica

- [ ] First Load: dashboard < 3 segundos
- [ ] Mutações (POST/PUT/DELETE) < 500ms
- [ ] Sem requisições duplicadas no Network tab

### Segurança

- [ ] `CORS_ORIGINS` aceita apenas o domínio correto (verificar no DevTools → Network → CORS headers)
- [ ] `DATABASE_URL` não exposta no frontend (verificar source code)
- [ ] `NODE_ENV=production` no Railway

---

## Variáveis de ambiente — Referência completa

### Frontend (`artifacts/vertex-finance/.env`)

```env
VITE_API_URL=https://api.vertexos.com
# Em Replit dev: deixar vazio (calculado automaticamente)
```

### Backend (`artifacts/api-server/.env`)

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
PORT=8080
CORS_ORIGINS=https://vertexos.com
NODE_ENV=production
```

---

## Comandos úteis

```bash
# Build frontend localmente (testar antes do deploy)
BASE_PATH=/ pnpm --filter @workspace/vertex-finance run build

# Build backend localmente
pnpm --filter @workspace/api-server run build

# Aplicar schema ao banco externo
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db run push

# Verificar backend no Railway
curl https://vertex-os-api.railway.app/health
```
