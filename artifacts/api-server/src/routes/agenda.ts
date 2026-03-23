import { Router } from "express";
import { db } from "@workspace/db";
import { agendaEventsTable } from "@workspace/db";
import { eq, gte, lte, and } from "drizzle-orm";

const router = Router();

router.get("/agenda/events", async (req, res) => {
  try {
    const { month, year } = req.query;
    let events;
    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
      events = await db
        .select()
        .from(agendaEventsTable)
        .where(and(gte(agendaEventsTable.data, startDate), lte(agendaEventsTable.data, endDate)))
        .orderBy(agendaEventsTable.data);
    } else {
      events = await db.select().from(agendaEventsTable).orderBy(agendaEventsTable.data);
    }
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar eventos" });
  }
});

router.post("/agenda/events", async (req, res) => {
  try {
    const { titulo, data, horaInicio, horaFim, descricao, categoria, alerta, cor } = req.body;
    if (!titulo || !data) return res.status(400).json({ error: "titulo e data são obrigatórios" });
    const [event] = await db
      .insert(agendaEventsTable)
      .values({ titulo, data, horaInicio, horaFim, descricao, categoria: categoria || "pessoal", alerta: alerta || false, cor: cor || "#6366F1" })
      .returning();
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar evento" });
  }
});

router.put("/agenda/events/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, data, horaInicio, horaFim, descricao, categoria, alerta, cor } = req.body;
    const [updated] = await db
      .update(agendaEventsTable)
      .set({ titulo, data, horaInicio, horaFim, descricao, categoria, alerta, cor, updatedAt: new Date() })
      .where(eq(agendaEventsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Evento não encontrado" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar evento" });
  }
});

router.delete("/agenda/events/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(agendaEventsTable).where(eq(agendaEventsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar evento" });
  }
});

export default router;
