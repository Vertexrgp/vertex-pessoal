import { Router } from "express";
import { db } from "@workspace/db";
import {
  growthGoals,
  growthObjectives,
  growthPlans,
  growthCheckpoints,
  growthVision,
  visionBoardItems,
} from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";

const router = Router();

// ─── METAS (Goals) ────────────────────────────────────────────────────────────

router.get("/crescimento/goals", async (_req, res) => {
  try {
    const goals = await db.select().from(growthGoals).orderBy(desc(growthGoals.createdAt));
    res.json(goals);
  } catch {
    res.status(500).json({ error: "Erro ao buscar metas" });
  }
});

router.post("/crescimento/goals", async (req, res) => {
  try {
    const { titulo, descricao, tipo, prazo, status, prioridade, progresso, cor } = req.body;
    if (!titulo) return res.status(400).json({ error: "titulo é obrigatório" });
    const [goal] = await db
      .insert(growthGoals)
      .values({
        titulo,
        descricao: descricao || null,
        tipo: tipo || "pessoal",
        prazo: prazo || null,
        status: status || "ativa",
        prioridade: prioridade || "media",
        progresso: progresso ?? 0,
        cor: cor || "#6366F1",
      })
      .returning();
    res.json(goal);
  } catch {
    res.status(500).json({ error: "Erro ao criar meta" });
  }
});

router.put("/crescimento/goals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, descricao, tipo, prazo, status, prioridade, progresso, cor } = req.body;
    const [updated] = await db
      .update(growthGoals)
      .set({ titulo, descricao, tipo, prazo, status, prioridade, progresso, cor, updatedAt: new Date() })
      .where(eq(growthGoals.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Meta não encontrada" });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao atualizar meta" });
  }
});

router.delete("/crescimento/goals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(growthGoals).where(eq(growthGoals.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao deletar meta" });
  }
});

// ─── OBJETIVOS (Objectives) ───────────────────────────────────────────────────

router.get("/crescimento/objectives", async (req, res) => {
  try {
    const goalId = req.query.goalId ? parseInt(req.query.goalId as string) : null;
    const query = db.select().from(growthObjectives).orderBy(asc(growthObjectives.ordem));
    const objectives = goalId
      ? await db.select().from(growthObjectives).where(eq(growthObjectives.goalId, goalId)).orderBy(asc(growthObjectives.ordem))
      : await query;
    res.json(objectives);
  } catch {
    res.status(500).json({ error: "Erro ao buscar objetivos" });
  }
});

router.post("/crescimento/objectives", async (req, res) => {
  try {
    const { goalId, titulo, descricao, status, ordem } = req.body;
    if (!goalId || !titulo) return res.status(400).json({ error: "goalId e titulo são obrigatórios" });
    const [obj] = await db
      .insert(growthObjectives)
      .values({ goalId: parseInt(goalId), titulo, descricao: descricao || null, status: status || "pendente", ordem: ordem ?? 0 })
      .returning();
    res.json(obj);
  } catch {
    res.status(500).json({ error: "Erro ao criar objetivo" });
  }
});

router.put("/crescimento/objectives/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, descricao, status, ordem } = req.body;
    const [updated] = await db
      .update(growthObjectives)
      .set({ titulo, descricao, status, ordem, updatedAt: new Date() })
      .where(eq(growthObjectives.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Objetivo não encontrado" });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao atualizar objetivo" });
  }
});

router.delete("/crescimento/objectives/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(growthObjectives).where(eq(growthObjectives.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao deletar objetivo" });
  }
});

// ─── PLANOS (Plans) ───────────────────────────────────────────────────────────

router.get("/crescimento/plans", async (req, res) => {
  try {
    const objectiveId = req.query.objectiveId ? parseInt(req.query.objectiveId as string) : null;
    const plans = objectiveId
      ? await db.select().from(growthPlans).where(eq(growthPlans.objectiveId, objectiveId)).orderBy(asc(growthPlans.ordem))
      : await db.select().from(growthPlans).orderBy(asc(growthPlans.ordem));
    res.json(plans);
  } catch {
    res.status(500).json({ error: "Erro ao buscar planos" });
  }
});

router.post("/crescimento/plans", async (req, res) => {
  try {
    const { objectiveId, titulo, descricao, status, ordem } = req.body;
    if (!objectiveId || !titulo) return res.status(400).json({ error: "objectiveId e titulo são obrigatórios" });
    const [plan] = await db
      .insert(growthPlans)
      .values({ objectiveId: parseInt(objectiveId), titulo, descricao: descricao || null, status: status || "pendente", ordem: ordem ?? 0 })
      .returning();
    res.json(plan);
  } catch {
    res.status(500).json({ error: "Erro ao criar plano" });
  }
});

router.put("/crescimento/plans/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, descricao, status, ordem } = req.body;
    const [updated] = await db
      .update(growthPlans)
      .set({ titulo, descricao, status, ordem })
      .where(eq(growthPlans.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Plano não encontrado" });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao atualizar plano" });
  }
});

router.delete("/crescimento/plans/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(growthPlans).where(eq(growthPlans.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao deletar plano" });
  }
});

// ─── CHECKPOINTS ──────────────────────────────────────────────────────────────

router.get("/crescimento/checkpoints", async (req, res) => {
  try {
    const goalId = req.query.goalId ? parseInt(req.query.goalId as string) : null;
    const cps = goalId
      ? await db.select().from(growthCheckpoints).where(eq(growthCheckpoints.goalId, goalId)).orderBy(asc(growthCheckpoints.data))
      : await db.select().from(growthCheckpoints).orderBy(asc(growthCheckpoints.data));
    res.json(cps);
  } catch {
    res.status(500).json({ error: "Erro ao buscar checkpoints" });
  }
});

router.post("/crescimento/checkpoints", async (req, res) => {
  try {
    const { goalId, titulo, descricao, data, concluido, status, progresso } = req.body;
    if (!goalId || !titulo) return res.status(400).json({ error: "goalId e titulo são obrigatórios" });
    const [cp] = await db
      .insert(growthCheckpoints)
      .values({ goalId: parseInt(goalId), titulo, descricao: descricao || null, data: data || null, concluido: concluido ?? false, status: status || "pendente", progresso: progresso ?? 0 })
      .returning();
    res.json(cp);
  } catch {
    res.status(500).json({ error: "Erro ao criar checkpoint" });
  }
});

router.put("/crescimento/checkpoints/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, descricao, data, concluido, status, progresso } = req.body;
    const setObj: Record<string, unknown> = {};
    if (titulo !== undefined) setObj.titulo = titulo;
    if (descricao !== undefined) setObj.descricao = descricao;
    if (data !== undefined) setObj.data = data;
    if (concluido !== undefined) setObj.concluido = concluido;
    if (status !== undefined) setObj.status = status;
    if (progresso !== undefined) setObj.progresso = progresso;
    const [updated] = await db
      .update(growthCheckpoints)
      .set(setObj)
      .where(eq(growthCheckpoints.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Checkpoint não encontrado" });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao atualizar checkpoint" });
  }
});

router.delete("/crescimento/checkpoints/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(growthCheckpoints).where(eq(growthCheckpoints.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao deletar checkpoint" });
  }
});

// ─── VISION BOARD ─────────────────────────────────────────────────────────────

router.get("/crescimento/vision", async (_req, res) => {
  try {
    const items = await db.select().from(growthVision).orderBy(desc(growthVision.createdAt));
    res.json(items);
  } catch {
    res.status(500).json({ error: "Erro ao buscar vision board" });
  }
});

router.post("/crescimento/vision", async (req, res) => {
  try {
    const { titulo, tipo, conteudo, categoria, goalId, cor } = req.body;
    if (!titulo || !conteudo) return res.status(400).json({ error: "titulo e conteudo são obrigatórios" });
    const [item] = await db
      .insert(growthVision)
      .values({ titulo, tipo: tipo || "frase", conteudo, categoria: categoria || "geral", goalId: goalId ? parseInt(goalId) : null, cor: cor || "#6366F1" })
      .returning();
    res.json(item);
  } catch {
    res.status(500).json({ error: "Erro ao criar item do vision board" });
  }
});

router.put("/crescimento/vision/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, tipo, conteudo, categoria, goalId, cor } = req.body;
    const [updated] = await db
      .update(growthVision)
      .set({ titulo, tipo, conteudo, categoria, goalId, cor })
      .where(eq(growthVision.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Item não encontrado" });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao atualizar item" });
  }
});

router.delete("/crescimento/vision/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(growthVision).where(eq(growthVision.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao deletar item" });
  }
});

// ─── VISION BOARD CANVAS ──────────────────────────────────────────────────────

router.get("/crescimento/vision-board-items", async (_req, res) => {
  try {
    const items = await db.select().from(visionBoardItems).orderBy(asc(visionBoardItems.zIndex));
    res.json(items);
  } catch {
    res.status(500).json({ error: "Erro ao buscar itens" });
  }
});

router.post("/crescimento/vision-board-items", async (req, res) => {
  try {
    const { tipo, conteudo, x, y, largura, altura, zIndex, cor, fontSize, rotacao } = req.body;
    if (!tipo || !conteudo) return res.status(400).json({ error: "tipo e conteudo são obrigatórios" });
    const [item] = await db
      .insert(visionBoardItems)
      .values({ tipo, conteudo, x: x ?? 100, y: y ?? 100, largura: largura ?? 220, altura: altura ?? 160, zIndex: zIndex ?? 1, cor: cor ?? "#FFFFFF", fontSize: fontSize ?? 16, rotacao: rotacao ?? 0 })
      .returning();
    res.json(item);
  } catch {
    res.status(500).json({ error: "Erro ao criar item" });
  }
});

router.put("/crescimento/vision-board-items/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { tipo, conteudo, x, y, largura, altura, zIndex, cor, fontSize, rotacao } = req.body;
    const [item] = await db
      .update(visionBoardItems)
      .set({ tipo, conteudo, x, y, largura, altura, zIndex, cor, fontSize, rotacao, updatedAt: new Date() })
      .where(eq(visionBoardItems.id, id))
      .returning();
    if (!item) return res.status(404).json({ error: "Item não encontrado" });
    res.json(item);
  } catch {
    res.status(500).json({ error: "Erro ao atualizar item" });
  }
});

router.delete("/crescimento/vision-board-items/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(visionBoardItems).where(eq(visionBoardItems.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao deletar item" });
  }
});

export default router;
