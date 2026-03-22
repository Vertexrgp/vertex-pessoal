import { Router } from "express";
import { db } from "@workspace/db";
import { recurringTransactionsTable, categoriesTable, accountsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const selectFields = {
  id: recurringTransactionsTable.id,
  tipo: recurringTransactionsTable.tipo,
  descricao: recurringTransactionsTable.descricao,
  categoriaId: recurringTransactionsTable.categoriaId,
  categoriaName: categoriesTable.name,
  valor: recurringTransactionsTable.valor,
  formaPagamento: recurringTransactionsTable.formaPagamento,
  contaId: recurringTransactionsTable.contaId,
  contaName: accountsTable.name,
  diaVencimento: recurringTransactionsTable.diaVencimento,
  frequencia: recurringTransactionsTable.frequencia,
  dataInicio: recurringTransactionsTable.dataInicio,
  dataFim: recurringTransactionsTable.dataFim,
  ativo: recurringTransactionsTable.ativo,
  tipoCusto: recurringTransactionsTable.tipoCusto,
  obrigatorio: recurringTransactionsTable.obrigatorio,
  observacoes: recurringTransactionsTable.observacoes,
  createdAt: recurringTransactionsTable.createdAt,
};

function parseBody(body: any) {
  return {
    tipo: String(body.tipo ?? "despesa"),
    descricao: String(body.descricao ?? ""),
    categoriaId: body.categoriaId ? Number(body.categoriaId) : null,
    valor: String(Number(body.valor ?? 0).toFixed(2)),
    formaPagamento: body.formaPagamento ? String(body.formaPagamento) : null,
    contaId: body.contaId ? Number(body.contaId) : null,
    diaVencimento: Math.round(Number(body.diaVencimento ?? 1)),
    frequencia: String(body.frequencia ?? "mensal"),
    dataInicio: String(body.dataInicio ?? new Date().toISOString().split("T")[0]),
    dataFim: body.dataFim ? String(body.dataFim) : null,
    ativo: body.ativo !== false,
    tipoCusto: String(body.tipoCusto ?? "fixo"),
    obrigatorio: body.obrigatorio !== false,
    observacoes: body.observacoes ? String(body.observacoes) : null,
  };
}

// ─── LIST ─────────────────────────────────────────────────────────────────────
router.get("/recurring", async (_req, res) => {
  const rows = await db
    .select(selectFields)
    .from(recurringTransactionsTable)
    .leftJoin(categoriesTable, eq(recurringTransactionsTable.categoriaId, categoriesTable.id))
    .leftJoin(accountsTable, eq(recurringTransactionsTable.contaId, accountsTable.id))
    .orderBy(recurringTransactionsTable.tipo, recurringTransactionsTable.descricao);

  res.json(rows.map(r => ({ ...r, valor: Number(r.valor) })));
});

// ─── CREATE ───────────────────────────────────────────────────────────────────
router.post("/recurring", async (req, res) => {
  const data = parseBody(req.body);
  const [row] = await db.insert(recurringTransactionsTable).values(data).returning();
  res.status(201).json({ ...row, valor: Number(row.valor) });
});

// ─── UPDATE ───────────────────────────────────────────────────────────────────
router.put("/recurring/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const data = parseBody(req.body);
  const [row] = await db
    .update(recurringTransactionsTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(recurringTransactionsTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ ...row, valor: Number(row.valor) });
});

// ─── TOGGLE ATIVO ─────────────────────────────────────────────────────────────
router.patch("/recurring/:id/toggle", async (req, res) => {
  const id = parseInt(req.params.id);
  const [current] = await db
    .select({ ativo: recurringTransactionsTable.ativo })
    .from(recurringTransactionsTable)
    .where(eq(recurringTransactionsTable.id, id));
  if (!current) return res.status(404).json({ error: "Not found" });
  const [row] = await db
    .update(recurringTransactionsTable)
    .set({ ativo: !current.ativo, updatedAt: new Date() })
    .where(eq(recurringTransactionsTable.id, id))
    .returning();
  res.json({ ...row, valor: Number(row.valor) });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────
router.delete("/recurring/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(recurringTransactionsTable).where(eq(recurringTransactionsTable.id, id));
  res.status(204).send();
});

export default router;
