import { Router } from "express";
import { db } from "@workspace/db";
import { agendaEventsTable, agendaPlannerTasksTable, agendaRecurringSeriesTable } from "@workspace/db";
import { eq, gte, lte, and, or, isNull, isNotNull } from "drizzle-orm";

// ─── Date helpers ─────────────────────────────────────────────────────────────

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

function addDaysToStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function dateStrToDate(s: string): Date {
  return new Date(s + "T12:00:00");
}

// ─── Recurrence generation ────────────────────────────────────────────────────

function generateRecurringDates(
  series: { startDate: string; recurrenceType: string; recurrenceDays: string | null; recurrenceEndDate: string | null; recurrenceInterval: number },
  fromDate: string,
  toDate: string
): string[] {
  const results: string[] = [];
  const start = dateStrToDate(series.startDate);
  const from = dateStrToDate(fromDate);
  const to = dateStrToDate(toDate);
  const seriesEnd = series.recurrenceEndDate ? dateStrToDate(series.recurrenceEndDate) : null;

  const current = new Date(Math.max(start.getTime(), from.getTime()));
  current.setHours(12, 0, 0, 0);

  const customDays: number[] = series.recurrenceDays ? JSON.parse(series.recurrenceDays) : [];
  const interval = Math.max(1, series.recurrenceInterval || 1);

  // For weekly: track from start date
  const startDow = start.getDay();

  while (current <= to) {
    if (seriesEnd && current > seriesEnd) break;

    const dow = current.getDay();
    let include = false;

    switch (series.recurrenceType) {
      case "daily": {
        const daysDiff = Math.round((current.getTime() - start.getTime()) / 86400000);
        include = daysDiff >= 0 && daysDiff % interval === 0;
        break;
      }
      case "weekdays":
        include = dow >= 1 && dow <= 5;
        break;
      case "weekly": {
        const weeksDiff = Math.floor(Math.round((current.getTime() - start.getTime()) / 86400000) / 7);
        include = dow === startDow && weeksDiff >= 0 && weeksDiff % interval === 0;
        break;
      }
      case "monthly":
        include = current.getDate() === start.getDate();
        break;
      case "custom":
        include = customDays.includes(dow);
        break;
    }

    if (include) {
      const dateStr = current.toISOString().split("T")[0];
      if (dateStr >= series.startDate) {
        results.push(dateStr);
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return results;
}

async function generateAndInsertInstances(
  series: typeof agendaRecurringSeriesTable.$inferSelect,
  fromDate: string,
  toDate: string
): Promise<void> {
  const dates = generateRecurringDates(series, fromDate, toDate);
  if (dates.length === 0) return;

  // Fetch existing scheduledDates for this series to avoid duplicates
  const existingRaw = await db
    .select({ scheduledDate: agendaPlannerTasksTable.scheduledDate })
    .from(agendaPlannerTasksTable)
    .where(eq(agendaPlannerTasksTable.recurringSeriesId, series.id));
  const existingDates = new Set(existingRaw.map((r) => r.scheduledDate).filter(Boolean));

  const newDates = dates.filter((d) => !existingDates.has(d));
  if (newDates.length === 0) return;

  const inserts = newDates.map((dateStr) => ({
    semanaInicio: getMondayStr(dateStr),
    titulo: series.titulo,
    descricao: series.descricao,
    prioridade: series.prioridade,
    categoria: series.categoria,
    estimativaTempo: series.estimativaTempo,
    observacao: series.observacao,
    startTime: series.startTime,
    endTime: series.endTime,
    status: "pendente" as const,
    diaSemana: getDiaSemanaStr(dateStr),
    scheduledDate: dateStr,
    recurringSeriesId: series.id,
    isRecurringException: false,
    ordem: 0,
    postergadaCount: 0,
    isFoco: false,
  }));

  // Insert in chunks to avoid overwhelming the DB
  const CHUNK = 50;
  for (let i = 0; i < inserts.length; i += CHUNK) {
    await db.insert(agendaPlannerTasksTable).values(inserts.slice(i, i + CHUNK));
  }
}

const router = Router();

// ─── Events ───────────────────────────────────────────────────────────────────

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

// ─── Recurring Series ─────────────────────────────────────────────────────────

router.get("/agenda/recurring-series", async (_req, res) => {
  try {
    const series = await db.select().from(agendaRecurringSeriesTable).orderBy(agendaRecurringSeriesTable.createdAt);
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar séries" });
  }
});

router.post("/agenda/recurring-series", async (req, res) => {
  try {
    const {
      titulo, descricao, prioridade, categoria, estimativaTempo, observacao,
      startTime, endTime, recurrenceType, recurrenceInterval, recurrenceDays,
      startDate, recurrenceEndDate,
    } = req.body;

    if (!titulo || !recurrenceType || !startDate) {
      return res.status(400).json({ error: "titulo, recurrenceType e startDate são obrigatórios" });
    }

    // Generate up to 26 weeks from startDate
    const horizon = addDaysToStr(startDate, 26 * 7);
    const genUntil = recurrenceEndDate && recurrenceEndDate < horizon ? recurrenceEndDate : horizon;

    const [series] = await db
      .insert(agendaRecurringSeriesTable)
      .values({
        titulo,
        descricao,
        prioridade: prioridade || "media",
        categoria,
        estimativaTempo,
        observacao,
        startTime,
        endTime,
        recurrenceType,
        recurrenceInterval: recurrenceInterval || 1,
        recurrenceDays: recurrenceDays ? JSON.stringify(recurrenceDays) : null,
        startDate,
        recurrenceEndDate: recurrenceEndDate || null,
        generatedUntil: genUntil,
      })
      .returning();

    // Generate all instances
    await generateAndInsertInstances(series, startDate, genUntil);

    // Return the tasks created for the start week so the UI can refresh
    const startWeek = getMondayStr(startDate);
    const tasks = await db
      .select()
      .from(agendaPlannerTasksTable)
      .where(
        and(
          eq(agendaPlannerTasksTable.recurringSeriesId, series.id),
          eq(agendaPlannerTasksTable.semanaInicio, startWeek)
        )
      )
      .orderBy(agendaPlannerTasksTable.scheduledDate);

    res.json({ series, tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar série recorrente" });
  }
});

router.delete("/agenda/recurring-series/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Delete all non-exception tasks in the series
    await db
      .delete(agendaPlannerTasksTable)
      .where(eq(agendaPlannerTasksTable.recurringSeriesId, id));
    // Delete the series
    await db.delete(agendaRecurringSeriesTable).where(eq(agendaRecurringSeriesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar série" });
  }
});

// ─── Planner Tasks ────────────────────────────────────────────────────────────

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
    const semanaStr = String(semana);
    const weekEnd = addDaysToStr(semanaStr, 6);

    // ── Lazy-extend recurring series if user has navigated beyond generatedUntil ──
    const activeSeries = await db
      .select()
      .from(agendaRecurringSeriesTable)
      .where(
        and(
          lte(agendaRecurringSeriesTable.startDate, weekEnd),
          or(
            isNull(agendaRecurringSeriesTable.recurrenceEndDate),
            gte(agendaRecurringSeriesTable.recurrenceEndDate, semanaStr)
          )
        )
      );

    for (const series of activeSeries) {
      if (series.generatedUntil < weekEnd) {
        // Extend generation: from day after generatedUntil to weekEnd + 12 weeks
        const newFrom = addDaysToStr(series.generatedUntil, 1);
        const newTo = addDaysToStr(weekEnd, 12 * 7);
        const genUntil = series.recurrenceEndDate && series.recurrenceEndDate < newTo
          ? series.recurrenceEndDate
          : newTo;

        await generateAndInsertInstances(series, newFrom, genUntil);
        await db
          .update(agendaRecurringSeriesTable)
          .set({ generatedUntil: genUntil, updatedAt: new Date() })
          .where(eq(agendaRecurringSeriesTable.id, series.id));
      }
    }

    // Fetch tasks for this week
    const tasks = await db
      .select()
      .from(agendaPlannerTasksTable)
      .where(eq(agendaPlannerTasksTable.semanaInicio, semanaStr))
      .orderBy(agendaPlannerTasksTable.ordem);

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar tarefas" });
  }
});

router.post("/agenda/planner", async (req, res) => {
  try {
    const {
      semanaInicio, titulo, descricao, prioridade, categoria, estimativaTempo,
      status, diaSemana, scheduledDate, startTime, endTime,
      ordem, observacao, goalId, checkpointId,
    } = req.body;
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
        titulo, descricao,
        prioridade: prioridade || "media",
        categoria, estimativaTempo,
        status: status || "pendente",
        diaSemana: resolvedDiaSemana,
        scheduledDate: scheduledDate || null,
        startTime: startTime || null,
        endTime: endTime || null,
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
    const {
      titulo, descricao, prioridade, categoria, estimativaTempo,
      status, diaSemana, scheduledDate, startTime, endTime,
      ordem, observacao, postergadaCount, isFoco,
      editMode, // 'single' | 'future' | 'all'
    } = req.body;

    const [task] = await db.select().from(agendaPlannerTasksTable).where(eq(agendaPlannerTasksTable.id, id));
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });

    const setObj: Record<string, unknown> = { updatedAt: new Date() };
    if (titulo !== undefined) setObj.titulo = titulo;
    if (descricao !== undefined) setObj.descricao = descricao;
    if (prioridade !== undefined) setObj.prioridade = prioridade;
    if (categoria !== undefined) setObj.categoria = categoria;
    if (estimativaTempo !== undefined) setObj.estimativaTempo = estimativaTempo;
    if (status !== undefined) setObj.status = status;
    if (startTime !== undefined) setObj.startTime = startTime;
    if (endTime !== undefined) setObj.endTime = endTime;
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

    // ── Handle recurring edit modes ──
    if (task.recurringSeriesId && editMode && editMode !== "single") {
      const currentDate = task.scheduledDate || task.semanaInicio;

      if (editMode === "future") {
        // Update this task + all future tasks in this series (with same scheduledDate >= currentDate)
        await db
          .update(agendaPlannerTasksTable)
          .set(setObj)
          .where(
            and(
              eq(agendaPlannerTasksTable.recurringSeriesId, task.recurringSeriesId),
              gte(agendaPlannerTasksTable.scheduledDate ?? agendaPlannerTasksTable.semanaInicio, currentDate)
            )
          );

        // Also update the series record if base fields changed
        if (titulo !== undefined || prioridade !== undefined || categoria !== undefined ||
            startTime !== undefined || endTime !== undefined || estimativaTempo !== undefined) {
          const seriesUpdate: Record<string, unknown> = { updatedAt: new Date() };
          if (titulo !== undefined) seriesUpdate.titulo = titulo;
          if (prioridade !== undefined) seriesUpdate.prioridade = prioridade;
          if (categoria !== undefined) seriesUpdate.categoria = categoria;
          if (startTime !== undefined) seriesUpdate.startTime = startTime;
          if (endTime !== undefined) seriesUpdate.endTime = endTime;
          if (estimativaTempo !== undefined) seriesUpdate.estimativaTempo = estimativaTempo;
          await db.update(agendaRecurringSeriesTable).set(seriesUpdate).where(eq(agendaRecurringSeriesTable.id, task.recurringSeriesId));
        }

        const [updated] = await db.select().from(agendaPlannerTasksTable).where(eq(agendaPlannerTasksTable.id, id));
        return res.json(updated);
      }

      if (editMode === "all") {
        // Update ALL tasks in the series
        await db
          .update(agendaPlannerTasksTable)
          .set(setObj)
          .where(eq(agendaPlannerTasksTable.recurringSeriesId, task.recurringSeriesId));

        // Update series record
        const seriesUpdate: Record<string, unknown> = { updatedAt: new Date() };
        if (titulo !== undefined) seriesUpdate.titulo = titulo;
        if (prioridade !== undefined) seriesUpdate.prioridade = prioridade;
        if (categoria !== undefined) seriesUpdate.categoria = categoria;
        if (startTime !== undefined) seriesUpdate.startTime = startTime;
        if (endTime !== undefined) seriesUpdate.endTime = endTime;
        if (estimativaTempo !== undefined) seriesUpdate.estimativaTempo = estimativaTempo;
        await db.update(agendaRecurringSeriesTable).set(seriesUpdate).where(eq(agendaRecurringSeriesTable.id, task.recurringSeriesId));

        const [updated] = await db.select().from(agendaPlannerTasksTable).where(eq(agendaPlannerTasksTable.id, id));
        return res.json(updated);
      }
    }

    // Default: single task update (mark as exception if recurring)
    if (task.recurringSeriesId && editMode === "single") {
      setObj.isRecurringException = true;
    }

    const [updated] = await db
      .update(agendaPlannerTasksTable)
      .set(setObj)
      .where(eq(agendaPlannerTasksTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Tarefa não encontrada" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar tarefa" });
  }
});

router.delete("/agenda/planner/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { deleteMode } = req.query; // 'single' | 'all'

    const [task] = await db.select().from(agendaPlannerTasksTable).where(eq(agendaPlannerTasksTable.id, id));
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });

    if (task.recurringSeriesId && deleteMode === "all") {
      await db.delete(agendaPlannerTasksTable).where(eq(agendaPlannerTasksTable.recurringSeriesId, task.recurringSeriesId));
      await db.delete(agendaRecurringSeriesTable).where(eq(agendaRecurringSeriesTable.id, task.recurringSeriesId));
    } else {
      await db.delete(agendaPlannerTasksTable).where(eq(agendaPlannerTasksTable.id, id));
    }

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
    const { id: _id, createdAt: _c, updatedAt: _u, recurringSeriesId: _rs, ...rest } = original;
    const [dup] = await db
      .insert(agendaPlannerTasksTable)
      .values({ ...rest, titulo: `${original.titulo} (cópia)`, status: "pendente", diaSemana: null, scheduledDate: null, postergadaCount: 0 })
      .returning();
    res.json(dup);
  } catch (err) {
    res.status(500).json({ error: "Erro ao duplicar tarefa" });
  }
});

router.post("/agenda/planner/:id/proxima-semana", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [task] = await db.select().from(agendaPlannerTasksTable).where(eq(agendaPlannerTasksTable.id, id));
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
    const nextWeek = addDaysToStr(task.semanaInicio, 7);
    const { id: _id, createdAt: _c, updatedAt: _u, recurringSeriesId: _rs, ...rest } = task;
    const [moved] = await db
      .insert(agendaPlannerTasksTable)
      .values({ ...rest, semanaInicio: nextWeek, status: "pendente", diaSemana: null, scheduledDate: null })
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

router.post("/agenda/planner/:id/postergar", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [task] = await db.select().from(agendaPlannerTasksTable).where(eq(agendaPlannerTasksTable.id, id));
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
    const nextWeek = addDaysToStr(task.semanaInicio, 7);
    const newCount = (task.postergadaCount || 0) + 1;
    const { id: _id, createdAt: _c, updatedAt: _u, recurringSeriesId: _rs, ...rest } = task;
    const [moved] = await db
      .insert(agendaPlannerTasksTable)
      .values({ ...rest, semanaInicio: nextWeek, status: "postergada", diaSemana: null, scheduledDate: null, postergadaCount: newCount })
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
