import { Router } from "express";
import { db } from "@workspace/db";
import { agendaEventsTable, agendaPlannerTasksTable } from "@workspace/db";
import { eq, gte, lte, and } from "drizzle-orm";

// ─── Date helpers ─────────────────────────────────────────
const DOW_TO_DIA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

function getMondayStr(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const dow = d.getDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysFromMonday);
  return monday.toISOString().split("T")[0];
}

function getDiaSemanaStr(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return DOW_TO_DIA[d.getDay()];
}

const router = Router();

// ─── Events ───────────────────────────────────────────────
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

// ─── Planner Tasks ────────────────────────────────────────
router.get("/agenda/planner", async (req, res) => {
  try {
    const { semana, goalId } = req.query;
    if (goalId) {
      const tasks = await db
        .select()
        .from(agendaPlannerTasksTable)
        .where(eq(agendaPlannerTasksTable.goalId, parseInt(String(goalId))))
        .orderBy(agendaPlannerTasksTable.createdAt);
      return res.json(tasks);
    }
    if (!semana) return res.status(400).json({ error: "semana é obrigatória (YYYY-MM-DD)" });
    const tasks = await db
      .select()
      .from(agendaPlannerTasksTable)
      .where(eq(agendaPlannerTasksTable.semanaInicio, String(semana)))
      .orderBy(agendaPlannerTasksTable.ordem);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar tarefas" });
  }
});

router.post("/agenda/planner", async (req, res) => {
  try {
    const { semanaInicio, titulo, descricao, prioridade, categoria, estimativaTempo, status, diaSemana, scheduledDate, ordem, observacao, goalId, checkpointId } = req.body;
    if (!titulo) return res.status(400).json({ error: "titulo é obrigatório" });

    let resolvedSemanaInicio = semanaInicio;
    let resolvedDiaSemana = diaSemana || null;

    if (scheduledDate) {
      resolvedSemanaInicio = getMondayStr(scheduledDate);
      resolvedDiaSemana = getDiaSemanaStr(scheduledDate);
    }

    if (!resolvedSemanaInicio) return res.status(400).json({ error: "semanaInicio ou scheduledDate é obrigatório" });

    const [task] = await db
      .insert(agendaPlannerTasksTable)
      .values({
        semanaInicio: resolvedSemanaInicio,
        titulo,
        descricao,
        prioridade: prioridade || "media",
        categoria,
        estimativaTempo,
        status: status || "pendente",
        diaSemana: resolvedDiaSemana,
        scheduledDate: scheduledDate || null,
        ordem: ordem || 0,
        observacao,
        postergadaCount: 0,
        goalId: goalId ? parseInt(goalId) : null,
        checkpointId: checkpointId ? parseInt(checkpointId) : null,
      })
      .returning();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar tarefa" });
  }
});

router.put("/agenda/planner/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, descricao, prioridade, categoria, estimativaTempo, status, diaSemana, scheduledDate, ordem, observacao, postergadaCount, isFoco } = req.body;
    const setObj: Record<string, unknown> = { updatedAt: new Date() };
    if (titulo !== undefined) setObj.titulo = titulo;
    if (descricao !== undefined) setObj.descricao = descricao;
    if (prioridade !== undefined) setObj.prioridade = prioridade;
    if (categoria !== undefined) setObj.categoria = categoria;
    if (estimativaTempo !== undefined) setObj.estimativaTempo = estimativaTempo;
    if (status !== undefined) setObj.status = status;
    if (ordem !== undefined) setObj.ordem = ordem;
    if (observacao !== undefined) setObj.observacao = observacao;
    if (postergadaCount !== undefined) setObj.postergadaCount = postergadaCount;
    if (isFoco !== undefined) setObj.isFoco = isFoco;
    if (scheduledDate !== undefined) {
      if (scheduledDate) {
        setObj.scheduledDate = scheduledDate;
        setObj.diaSemana = getDiaSemanaStr(scheduledDate);
        setObj.semanaInicio = getMondayStr(scheduledDate);
      } else {
        setObj.scheduledDate = null;
        setObj.diaSemana = diaSemana !== undefined ? diaSemana : null;
      }
    } else if (diaSemana !== undefined) {
      setObj.diaSemana = diaSemana;
    }
    const [updated] = await db
      .update(agendaPlannerTasksTable)
      .set(setObj)
      .where(eq(agendaPlannerTasksTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Tarefa não encontrada" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar tarefa" });
  }
});

router.delete("/agenda/planner/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(agendaPlannerTasksTable).where(eq(agendaPlannerTasksTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar tarefa" });
  }
});

router.post("/agenda/planner/:id/duplicar", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [original] = await db.select().from(agendaPlannerTasksTable).where(eq(agendaPlannerTasksTable.id, id));
    if (!original) return res.status(404).json({ error: "Tarefa não encontrada" });
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = original;
    const [copy] = await db
      .insert(agendaPlannerTasksTable)
      .values({ ...rest, titulo: `${original.titulo} (cópia)`, status: "pendente", diaSemana: null, postergadaCount: 0 })
      .returning();
    res.json(copy);
  } catch (err) {
    res.status(500).json({ error: "Erro ao duplicar tarefa" });
  }
});

router.post("/agenda/planner/:id/proxima-semana", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [task] = await db.select().from(agendaPlannerTasksTable).where(eq(agendaPlannerTasksTable.id, id));
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
    const current = new Date(task.semanaInicio);
    current.setDate(current.getDate() + 7);
    const nextWeek = current.toISOString().split("T")[0];
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = task;
    const [moved] = await db
      .insert(agendaPlannerTasksTable)
      .values({ ...rest, semanaInicio: nextWeek, status: "pendente", diaSemana: null })
      .returning();
    await db
      .update(agendaPlannerTasksTable)
      .set({ status: "proxima_semana", updatedAt: new Date() })
      .where(eq(agendaPlannerTasksTable.id, id));
    res.json(moved);
  } catch (err) {
    res.status(500).json({ error: "Erro ao mover tarefa" });
  }
});

// NEW: Mark as postergada (postpone) — increments counter + moves to next week
router.post("/agenda/planner/:id/postergar", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [task] = await db.select().from(agendaPlannerTasksTable).where(eq(agendaPlannerTasksTable.id, id));
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
    const current = new Date(task.semanaInicio);
    current.setDate(current.getDate() + 7);
    const nextWeek = current.toISOString().split("T")[0];
    const newCount = (task.postergadaCount || 0) + 1;
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = task;
    const [moved] = await db
      .insert(agendaPlannerTasksTable)
      .values({ ...rest, semanaInicio: nextWeek, status: "postergada", diaSemana: null, postergadaCount: newCount })
      .returning();
    await db
      .update(agendaPlannerTasksTable)
      .set({ status: "postergada", updatedAt: new Date() })
      .where(eq(agendaPlannerTasksTable.id, id));
    res.json(moved);
  } catch (err) {
    res.status(500).json({ error: "Erro ao postergar tarefa" });
  }
});

export default router;
