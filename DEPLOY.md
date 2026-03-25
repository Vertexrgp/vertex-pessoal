# Guia de Deploy — Vertex OS

## Variáveis de Ambiente

### Frontend (`artifacts/vertex-finance`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_API_URL` | Sim (prod) | URL base do servidor de API sem barra final.<br>Ex.: `https://api.vertexos.com` |

### API Server (`artifacts/api-server`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | String de conexão PostgreSQL |
| `PORT` | Não | Porta do servidor (padrão: 8080) |
| `CORS_ORIGINS` | Sim (prod) | Origens permitidas, separadas por vírgula.<br>Ex.: `https://vertexos.com` |
| `NODE_ENV` | Sim (prod) | Definir como `production` |

---

## Deploy com Vercel (frontend) + Railway/Render (backend)

### 1. Backend (Railway ou Render)

```bash
# Build
pnpm --filter @workspace/api-server run build

# Start
pnpm --filter @workspace/api-server run start
```

Variáveis a definir no painel do serviço:
- `DATABASE_URL` — string de conexão do PostgreSQL provisionado
- `CORS_ORIGINS` — domínio do frontend (ex.: `https://vertexos.com`)
- `NODE_ENV=production`

### 2. Banco de dados

Após provisionar o banco, rode as migrações:
```bash
pnpm --filter @workspace/db run push
```

### 3. Frontend (Vercel)

```bash
# Build
pnpm --filter @workspace/vertex-finance run build
```

Variáveis a definir no painel Vercel:
- `VITE_API_URL` — URL do backend (ex.: `https://api.vertexos.com`)

Pasta de saída: `artifacts/vertex-finance/dist`

---

## Health Check

O endpoint `/health` no servidor retorna:
```json
{ "status": "ok", "ts": "2026-03-25T12:00:00.000Z" }
```

Use-o para verificar se o backend está respondendo antes de direcionar tráfego.

---

## Deploy no Replit (ambiente atual)

Em desenvolvimento no Replit não é necessária nenhuma variável extra — a URL da API é calculada automaticamente a partir do `BASE_URL` do Vite.

Para publicar no Replit Autoscale:
1. Certifique-se de que `DATABASE_URL` está definida nos Secrets do Replit
2. Clique em **Deploy** no painel do Replit
3. O Replit fará o build e publicará ambos os serviços automaticamente
