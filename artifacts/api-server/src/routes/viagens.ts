import { Router } from "express";
import { db } from "@workspace/db";
import { viagensTripsTable, viagensExpensesTable, viagensChecklistTable, viagensRoteiroTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// Trips
router.get("/viagens/trips", async (_req, res) => {
  try {
    const trips = await db.select().from(viagensTripsTable).orderBy(viagensTripsTable.dataInicio);
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar viagens" });
  }
});

router.get("/viagens/trips/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [trip] = await db.select().from(viagensTripsTable).where(eq(viagensTripsTable.id, id));
    if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
    const expenses = await db.select().from(viagensExpensesTable).where(eq(viagensExpensesTable.viagemId, id));
    const checklist = await db.select().from(viagensChecklistTable).where(eq(viagensChecklistTable.viagemId, id));
    const roteiro = await db.select().from(viagensRoteiroTable).where(eq(viagensRoteiroTable.viagemId, id)).orderBy(viagensRoteiroTable.dia, viagensRoteiroTable.ordem);
    res.json({ trip, expenses, checklist, roteiro });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar viagem" });
  }
});

router.post("/viagens/trips", async (req, res) => {
  try {
    const { destino, dataInicio, dataFim, orcamento, status, descricao, capaUrl } = req.body;
    if (!destino) return res.status(400).json({ error: "destino é obrigatório" });
    const [trip] = await db
      .insert(viagensTripsTable)
      .values({ destino, dataInicio, dataFim, orcamento, status: status || "planejando", descricao, capaUrl })
      .returning();
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar viagem" });
  }
});

router.put("/viagens/trips/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { destino, dataInicio, dataFim, orcamento, status, descricao, capaUrl } = req.body;
    const [updated] = await db
      .update(viagensTripsTable)
      .set({ destino, dataInicio, dataFim, orcamento, status, descricao, capaUrl, updatedAt: new Date() })
      .where(eq(viagensTripsTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar viagem" });
  }
});

router.delete("/viagens/trips/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(viagensChecklistTable).where(eq(viagensChecklistTable.viagemId, id));
    await db.delete(viagensExpensesTable).where(eq(viagensExpensesTable.viagemId, id));
    await db.delete(viagensRoteiroTable).where(eq(viagensRoteiroTable.viagemId, id));
    await db.delete(viagensTripsTable).where(eq(viagensTripsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar viagem" });
  }
});

// Expenses
router.post("/viagens/trips/:id/expenses", async (req, res) => {
  try {
    const viagemId = parseInt(req.params.id);
    const { descricao, valor, categoria, data } = req.body;
    if (!descricao || !valor) return res.status(400).json({ error: "descricao e valor são obrigatórios" });
    const [expense] = await db.insert(viagensExpensesTable).values({ viagemId, descricao, valor, categoria: categoria || "outros", data }).returning();
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar despesa" });
  }
});

router.delete("/viagens/expenses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(viagensExpensesTable).where(eq(viagensExpensesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar despesa" });
  }
});

// Checklist
router.post("/viagens/trips/:id/checklist", async (req, res) => {
  try {
    const viagemId = parseInt(req.params.id);
    const { item } = req.body;
    if (!item) return res.status(400).json({ error: "item é obrigatório" });
    const [check] = await db.insert(viagensChecklistTable).values({ viagemId, item }).returning();
    res.json(check);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar item" });
  }
});

router.put("/viagens/checklist/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { concluido } = req.body;
    const [updated] = await db.update(viagensChecklistTable).set({ concluido }).where(eq(viagensChecklistTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar item" });
  }
});

router.delete("/viagens/checklist/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(viagensChecklistTable).where(eq(viagensChecklistTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar item" });
  }
});

// Roteiro
router.post("/viagens/trips/:id/roteiro", async (req, res) => {
  try {
    const viagemId = parseInt(req.params.id);
    const { dia, titulo, descricao, hora, ordem } = req.body;
    if (!dia || !titulo) return res.status(400).json({ error: "dia e titulo são obrigatórios" });
    const [item] = await db.insert(viagensRoteiroTable).values({ viagemId, dia, titulo, descricao, hora, ordem: ordem || 0 }).returning();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar roteiro" });
  }
});

router.delete("/viagens/roteiro/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(viagensRoteiroTable).where(eq(viagensRoteiroTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar roteiro" });
  }
});

export default router;
