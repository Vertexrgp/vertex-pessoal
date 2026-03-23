import { Router } from "express";
import { db, eventsLogTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();

// GET /events — últimos 60 eventos
router.get("/events", async (req, res) => {
  try {
    const events = await db
      .select()
      .from(eventsLogTable)
      .orderBy(desc(eventsLogTable.createdAt))
      .limit(60);
    res.json(events);
  } catch {
    res.status(500).json({ error: "Erro ao buscar eventos" });
  }
});

// GET /events/unread-count — qtd de eventos não lidos
router.get("/events/unread-count", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(eventsLogTable)
      .where(eq(eventsLogTable.lido, false));
    res.json({ count: rows.length });
  } catch {
    res.status(500).json({ error: "Erro ao contar eventos" });
  }
});

// POST /events — emitir evento
router.post("/events", async (req, res) => {
  try {
    const { tipo, origem, descricao, payload } = req.body;
    if (!tipo || !origem) return res.status(400).json({ error: "tipo e origem são obrigatórios" });
    const [event] = await db
      .insert(eventsLogTable)
      .values({ tipo, origem, descricao: descricao || null, payload: payload || null })
      .returning();
    res.json(event);
  } catch {
    res.status(500).json({ error: "Erro ao emitir evento" });
  }
});

// PUT /events/mark-read — marcar todos como lidos
router.put("/events/mark-read", async (req, res) => {
  try {
    await db.update(eventsLogTable).set({ lido: true });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao marcar eventos" });
  }
});

export default router;
