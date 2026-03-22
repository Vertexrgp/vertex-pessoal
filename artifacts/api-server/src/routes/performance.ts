import { Router } from "express";
import { db } from "@workspace/db";
import {
  performanceGoalsTable,
  performanceCurrentStateTable,
  performanceExamsTable,
  performanceProtocolsTable,
  performanceWorkoutsTable,
  performanceNutritionTable,
  performanceProgressTable,
  performanceExamMarkersTable,
  performanceMealPlansTable,
  performanceMealsTable,
  performanceBodyGoalTable,
  performanceBodyPhotosTable,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();

function parseNum(v: unknown) {
  const n = Number(v);
  return isNaN(n) ? null : String(n);
}

/* ─── Goals ──────────────────────────────────────────────────────────── */
router.get("/performance/goals", async (_req, res) => {
  const rows = await db.select().from(performanceGoalsTable).orderBy(desc(performanceGoalsTable.createdAt));
  res.json(rows);
});

router.post("/performance/goals", async (req, res) => {
  const b = req.body;
  if (!b.descricao) return res.status(400).json({ error: "descricao é obrigatório" });
  const [row] = await db.insert(performanceGoalsTable).values({
    descricao: String(b.descricao),
    fotoUrl: b.fotoUrl ? String(b.fotoUrl) : null,
    metaPeso: b.metaPeso ? parseNum(b.metaPeso) : null,
    metaBf: b.metaBf ? parseNum(b.metaBf) : null,
    metaEstetica: b.metaEstetica ? String(b.metaEstetica) : null,
    prazo: b.prazo ? String(b.prazo) : null,
    motivacao: b.motivacao ? String(b.motivacao) : null,
  }).returning();
  res.json(row);
});

router.put("/performance/goals/:id", async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body;
  const [row] = await db.update(performanceGoalsTable)
    .set({
      descricao: b.descricao ? String(b.descricao) : undefined,
      fotoUrl: b.fotoUrl !== undefined ? (b.fotoUrl ? String(b.fotoUrl) : null) : undefined,
      metaPeso: b.metaPeso !== undefined ? (b.metaPeso ? parseNum(b.metaPeso) : null) : undefined,
      metaBf: b.metaBf !== undefined ? (b.metaBf ? parseNum(b.metaBf) : null) : undefined,
      metaEstetica: b.metaEstetica !== undefined ? (b.metaEstetica || null) : undefined,
      prazo: b.prazo !== undefined ? (b.prazo || null) : undefined,
      motivacao: b.motivacao !== undefined ? (b.motivacao || null) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(performanceGoalsTable.id, id))
    .returning();
  res.json(row);
});

router.delete("/performance/goals/:id", async (req, res) => {
  await db.delete(performanceGoalsTable).where(eq(performanceGoalsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

/* ─── Current State ──────────────────────────────────────────────────── */
router.get("/performance/current-state", async (_req, res) => {
  const rows = await db.select().from(performanceCurrentStateTable).orderBy(desc(performanceCurrentStateTable.dataAvaliacao));
  res.json(rows);
});

router.post("/performance/current-state", async (req, res) => {
  const b = req.body;
  if (!b.dataAvaliacao) return res.status(400).json({ error: "dataAvaliacao é obrigatório" });
  const [row] = await db.insert(performanceCurrentStateTable).values({
    dataAvaliacao: String(b.dataAvaliacao),
    peso: b.peso ? parseNum(b.peso) : null,
    altura: b.altura ? parseNum(b.altura) : null,
    bf: b.bf ? parseNum(b.bf) : null,
    cintura: b.cintura ? parseNum(b.cintura) : null,
    quadril: b.quadril ? parseNum(b.quadril) : null,
    torax: b.torax ? parseNum(b.torax) : null,
    braco: b.braco ? parseNum(b.braco) : null,
    coxa: b.coxa ? parseNum(b.coxa) : null,
    fotosUrls: Array.isArray(b.fotosUrls) ? b.fotosUrls : [],
    observacoes: b.observacoes ? String(b.observacoes) : null,
  }).returning();
  res.json(row);
});

router.put("/performance/current-state/:id", async (req, res) => {
  const b = req.body;
  const [row] = await db.update(performanceCurrentStateTable)
    .set({
      peso: b.peso !== undefined ? (b.peso ? parseNum(b.peso) : null) : undefined,
      bf: b.bf !== undefined ? (b.bf ? parseNum(b.bf) : null) : undefined,
      cintura: b.cintura !== undefined ? (b.cintura ? parseNum(b.cintura) : null) : undefined,
      quadril: b.quadril !== undefined ? (b.quadril ? parseNum(b.quadril) : null) : undefined,
      torax: b.torax !== undefined ? (b.torax ? parseNum(b.torax) : null) : undefined,
      braco: b.braco !== undefined ? (b.braco ? parseNum(b.braco) : null) : undefined,
      coxa: b.coxa !== undefined ? (b.coxa ? parseNum(b.coxa) : null) : undefined,
      observacoes: b.observacoes !== undefined ? (b.observacoes || null) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(performanceCurrentStateTable.id, Number(req.params.id)))
    .returning();
  res.json(row);
});

/* ─── Exams ──────────────────────────────────────────────────────────── */
router.get("/performance/exams", async (_req, res) => {
  const rows = await db.select().from(performanceExamsTable).orderBy(desc(performanceExamsTable.data));
  res.json(rows);
});

router.post("/performance/exams", async (req, res) => {
  const b = req.body;
  if (!b.tipo || !b.data) return res.status(400).json({ error: "tipo e data são obrigatórios" });
  const [row] = await db.insert(performanceExamsTable).values({
    tipo: String(b.tipo),
    data: String(b.data),
    laboratorio: b.laboratorio ? String(b.laboratorio) : null,
    arquivoUrl: b.arquivoUrl ? String(b.arquivoUrl) : null,
    arquivoNome: b.arquivoNome ? String(b.arquivoNome) : null,
    resultados: b.resultados ? String(b.resultados) : null,
    observacoes: b.observacoes ? String(b.observacoes) : null,
  }).returning();
  res.json(row);
});

router.delete("/performance/exams/:id", async (req, res) => {
  await db.delete(performanceExamsTable).where(eq(performanceExamsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

/* ─── Protocols ──────────────────────────────────────────────────────── */
router.get("/performance/protocols", async (_req, res) => {
  const rows = await db.select().from(performanceProtocolsTable).orderBy(desc(performanceProtocolsTable.createdAt));
  res.json(rows);
});

router.post("/performance/protocols", async (req, res) => {
  const b = req.body;
  if (!b.nome || !b.tipo || !b.dosagem) return res.status(400).json({ error: "nome, tipo e dosagem são obrigatórios" });
  const [row] = await db.insert(performanceProtocolsTable).values({
    nome: String(b.nome),
    tipo: String(b.tipo),
    principioAtivo: b.principioAtivo ? String(b.principioAtivo) : null,
    dosagem: String(b.dosagem),
    unidade: b.unidade ? String(b.unidade) : null,
    horarios: Array.isArray(b.horarios) ? b.horarios : [],
    frequencia: b.frequencia ? String(b.frequencia) : "diario",
    viaAdministracao: b.viaAdministracao ? String(b.viaAdministracao) : null,
    cicloInicio: b.cicloInicio ? String(b.cicloInicio) : null,
    cicloFim: b.cicloFim ? String(b.cicloFim) : null,
    observacoes: b.observacoes ? String(b.observacoes) : null,
    ativo: b.ativo !== false,
  }).returning();
  res.json(row);
});

router.put("/performance/protocols/:id", async (req, res) => {
  const b = req.body;
  const [row] = await db.update(performanceProtocolsTable)
    .set({ ...b, updatedAt: new Date() })
    .where(eq(performanceProtocolsTable.id, Number(req.params.id)))
    .returning();
  res.json(row);
});

router.patch("/performance/protocols/:id/toggle", async (req, res) => {
  const [current] = await db.select().from(performanceProtocolsTable).where(eq(performanceProtocolsTable.id, Number(req.params.id)));
  const [row] = await db.update(performanceProtocolsTable)
    .set({ ativo: !current.ativo, updatedAt: new Date() })
    .where(eq(performanceProtocolsTable.id, Number(req.params.id)))
    .returning();
  res.json(row);
});

router.delete("/performance/protocols/:id", async (req, res) => {
  await db.delete(performanceProtocolsTable).where(eq(performanceProtocolsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

/* ─── Workouts ───────────────────────────────────────────────────────── */
router.get("/performance/workouts", async (_req, res) => {
  const rows = await db.select().from(performanceWorkoutsTable).orderBy(performanceWorkoutsTable.ordem);
  res.json(rows);
});

router.post("/performance/workouts", async (req, res) => {
  const b = req.body;
  if (!b.nome) return res.status(400).json({ error: "nome é obrigatório" });
  const [row] = await db.insert(performanceWorkoutsTable).values({
    nome: String(b.nome),
    letra: b.letra ? String(b.letra) : null,
    diaSemana: b.diaSemana ? String(b.diaSemana) : null,
    grupoMuscular: b.grupoMuscular ? String(b.grupoMuscular) : null,
    exercicios: Array.isArray(b.exercicios) ? b.exercicios : [],
    duracaoMin: b.duracaoMin ? Number(b.duracaoMin) : null,
    observacoes: b.observacoes ? String(b.observacoes) : null,
    ordem: b.ordem ? Number(b.ordem) : 0,
  }).returning();
  res.json(row);
});

router.put("/performance/workouts/:id", async (req, res) => {
  const b = req.body;
  const [row] = await db.update(performanceWorkoutsTable)
    .set({ ...b, updatedAt: new Date() })
    .where(eq(performanceWorkoutsTable.id, Number(req.params.id)))
    .returning();
  res.json(row);
});

router.delete("/performance/workouts/:id", async (req, res) => {
  await db.delete(performanceWorkoutsTable).where(eq(performanceWorkoutsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

/* ─── Nutrition ──────────────────────────────────────────────────────── */
router.get("/performance/nutrition", async (_req, res) => {
  const rows = await db.select().from(performanceNutritionTable).orderBy(desc(performanceNutritionTable.updatedAt));
  res.json(rows[0] ?? null);
});

router.post("/performance/nutrition", async (req, res) => {
  const b = req.body;
  if (!b.estrategia) return res.status(400).json({ error: "estrategia é obrigatória" });
  const [row] = await db.insert(performanceNutritionTable).values({
    estrategia: String(b.estrategia),
    calorias: b.calorias ? Number(b.calorias) : null,
    proteina: b.proteina ? parseNum(b.proteina) : null,
    carboidrato: b.carboidrato ? parseNum(b.carboidrato) : null,
    gordura: b.gordura ? parseNum(b.gordura) : null,
    refeicoes: Array.isArray(b.refeicoes) ? b.refeicoes : [],
    suplementos: b.suplementos ? String(b.suplementos) : null,
    observacoes: b.observacoes ? String(b.observacoes) : null,
  }).returning();
  res.json(row);
});

router.put("/performance/nutrition/:id", async (req, res) => {
  const b = req.body;
  const [row] = await db.update(performanceNutritionTable)
    .set({ ...b, updatedAt: new Date() })
    .where(eq(performanceNutritionTable.id, Number(req.params.id)))
    .returning();
  res.json(row);
});

/* ─── Progress ───────────────────────────────────────────────────────── */
router.get("/performance/progress", async (_req, res) => {
  const rows = await db.select().from(performanceProgressTable).orderBy(desc(performanceProgressTable.data));
  res.json(rows);
});

router.post("/performance/progress", async (req, res) => {
  const b = req.body;
  if (!b.data) return res.status(400).json({ error: "data é obrigatória" });
  const [row] = await db.insert(performanceProgressTable).values({
    data: String(b.data),
    peso: b.peso ? parseNum(b.peso) : null,
    bf: b.bf ? parseNum(b.bf) : null,
    cintura: b.cintura ? parseNum(b.cintura) : null,
    fotoUrl: b.fotoUrl ? String(b.fotoUrl) : null,
    humor: b.humor ? String(b.humor) : null,
    energia: b.energia ? Number(b.energia) : null,
    observacoes: b.observacoes ? String(b.observacoes) : null,
  }).returning();
  res.json(row);
});

router.delete("/performance/progress/:id", async (req, res) => {
  await db.delete(performanceProgressTable).where(eq(performanceProgressTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

/* ─── Exam Markers ───────────────────────────────────────────────────── */
router.get("/performance/exam-markers", async (req, res) => {
  const examId = req.query.examId ? Number(req.query.examId) : null;
  const query = examId
    ? db.select().from(performanceExamMarkersTable).where(eq(performanceExamMarkersTable.examId, examId))
    : db.select().from(performanceExamMarkersTable);
  const rows = await query;
  res.json(rows);
});

router.get("/performance/exam-markers/evolution", async (_req, res) => {
  const markers = await db
    .select({
      id: performanceExamMarkersTable.id,
      examId: performanceExamMarkersTable.examId,
      marcador: performanceExamMarkersTable.marcador,
      valor: performanceExamMarkersTable.valor,
      unidade: performanceExamMarkersTable.unidade,
      status: performanceExamMarkersTable.status,
      refMin: performanceExamMarkersTable.refMin,
      refMax: performanceExamMarkersTable.refMax,
      data: performanceExamsTable.data,
      examTipo: performanceExamsTable.tipo,
    })
    .from(performanceExamMarkersTable)
    .leftJoin(performanceExamsTable, eq(performanceExamMarkersTable.examId, performanceExamsTable.id))
    .orderBy(performanceExamsTable.data);

  const grouped: Record<string, any[]> = {};
  for (const m of markers) {
    if (!grouped[m.marcador]) grouped[m.marcador] = [];
    grouped[m.marcador].push(m);
  }
  res.json(grouped);
});

router.post("/performance/exam-markers", async (req, res) => {
  const b = req.body;
  if (!b.examId || !b.marcador || b.valor === undefined) {
    return res.status(400).json({ error: "examId, marcador e valor são obrigatórios" });
  }
  const [row] = await db.insert(performanceExamMarkersTable).values({
    examId: Number(b.examId),
    marcador: String(b.marcador),
    valor: String(parseFloat(b.valor)),
    unidade: b.unidade ? String(b.unidade) : null,
    refMin: b.refMin !== undefined && b.refMin !== null ? String(b.refMin) : null,
    refMax: b.refMax !== undefined && b.refMax !== null ? String(b.refMax) : null,
    status: b.status ? String(b.status) : "normal",
  }).returning();
  res.json(row);
});

router.delete("/performance/exam-markers/:id", async (req, res) => {
  await db.delete(performanceExamMarkersTable).where(eq(performanceExamMarkersTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

/* ─── Meal Plans ─────────────────────────────────────────────────────── */
router.get("/performance/meal-plans", async (_req, res) => {
  const rows = await db.select().from(performanceMealPlansTable).orderBy(desc(performanceMealPlansTable.createdAt));
  res.json(rows);
});

router.post("/performance/meal-plans", async (req, res) => {
  const b = req.body;
  if (!b.nome) return res.status(400).json({ error: "nome é obrigatório" });
  const [row] = await db.insert(performanceMealPlansTable).values({
    nome: String(b.nome),
    prescritoPor: b.prescritoPor ? String(b.prescritoPor) : null,
    dataInicio: b.dataInicio ? String(b.dataInicio) : null,
    dataFim: b.dataFim ? String(b.dataFim) : null,
    objetivo: b.objetivo ? String(b.objetivo) : null,
    ativo: b.ativo !== false,
    observacoes: b.observacoes ? String(b.observacoes) : null,
  }).returning();
  res.json(row);
});

router.put("/performance/meal-plans/:id", async (req, res) => {
  const b = req.body;
  const [row] = await db.update(performanceMealPlansTable)
    .set({ ...b, updatedAt: new Date() })
    .where(eq(performanceMealPlansTable.id, Number(req.params.id)))
    .returning();
  res.json(row);
});

router.patch("/performance/meal-plans/:id/toggle", async (req, res) => {
  const [current] = await db.select().from(performanceMealPlansTable).where(eq(performanceMealPlansTable.id, Number(req.params.id)));
  const [row] = await db.update(performanceMealPlansTable)
    .set({ ativo: !current.ativo, updatedAt: new Date() })
    .where(eq(performanceMealPlansTable.id, Number(req.params.id)))
    .returning();
  res.json(row);
});

router.delete("/performance/meal-plans/:id", async (req, res) => {
  await db.delete(performanceMealsTable).where(eq(performanceMealsTable.planoId, Number(req.params.id)));
  await db.delete(performanceMealPlansTable).where(eq(performanceMealPlansTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

/* ─── Meals ──────────────────────────────────────────────────────────── */
router.get("/performance/meals", async (req, res) => {
  const planoId = req.query.planoId ? Number(req.query.planoId) : null;
  if (!planoId) return res.status(400).json({ error: "planoId é obrigatório" });
  const rows = await db.select().from(performanceMealsTable)
    .where(eq(performanceMealsTable.planoId, planoId))
    .orderBy(performanceMealsTable.ordem);
  res.json(rows);
});

router.post("/performance/meals", async (req, res) => {
  const b = req.body;
  if (!b.planoId || !b.nome) return res.status(400).json({ error: "planoId e nome são obrigatórios" });
  const [row] = await db.insert(performanceMealsTable).values({
    planoId: Number(b.planoId),
    nome: String(b.nome),
    horario: b.horario ? String(b.horario) : null,
    alimentos: Array.isArray(b.alimentos) ? b.alimentos : [],
    observacoes: b.observacoes ? String(b.observacoes) : null,
    ordem: b.ordem ? Number(b.ordem) : 0,
  }).returning();
  res.json(row);
});

router.put("/performance/meals/:id", async (req, res) => {
  const b = req.body;
  const [row] = await db.update(performanceMealsTable)
    .set({ ...b, updatedAt: new Date() })
    .where(eq(performanceMealsTable.id, Number(req.params.id)))
    .returning();
  res.json(row);
});

router.delete("/performance/meals/:id", async (req, res) => {
  await db.delete(performanceMealsTable).where(eq(performanceMealsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

/* ─── Objetivo Físico — Body Goal ────────────────────────────────────── */
router.get("/performance/body-goal", async (_req, res) => {
  const rows = await db.select().from(performanceBodyGoalTable).orderBy(desc(performanceBodyGoalTable.createdAt));
  res.json(rows[0] ?? null);
});

router.post("/performance/body-goal", async (req, res) => {
  const b = req.body;
  const [row] = await db.insert(performanceBodyGoalTable).values({
    pesoAtual: b.pesoAtual ? parseNum(b.pesoAtual) : null,
    bfAtual: b.bfAtual ? parseNum(b.bfAtual) : null,
    pesoAlvo: b.pesoAlvo ? parseNum(b.pesoAlvo) : null,
    bfAlvo: b.bfAlvo ? parseNum(b.bfAlvo) : null,
    prazo: b.prazo ? String(b.prazo) : null,
  }).returning();
  res.json(row);
});

router.put("/performance/body-goal/:id", async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body;
  const [row] = await db.update(performanceBodyGoalTable)
    .set({
      pesoAtual: b.pesoAtual !== undefined ? (b.pesoAtual ? parseNum(b.pesoAtual) : null) : undefined,
      bfAtual: b.bfAtual !== undefined ? (b.bfAtual ? parseNum(b.bfAtual) : null) : undefined,
      pesoAlvo: b.pesoAlvo !== undefined ? (b.pesoAlvo ? parseNum(b.pesoAlvo) : null) : undefined,
      bfAlvo: b.bfAlvo !== undefined ? (b.bfAlvo ? parseNum(b.bfAlvo) : null) : undefined,
      prazo: b.prazo !== undefined ? (b.prazo || null) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(performanceBodyGoalTable.id, id))
    .returning();
  res.json(row);
});

/* ─── Objetivo Físico — Body Photos ─────────────────────────────────── */
router.get("/performance/body-photos", async (req, res) => {
  const goalId = req.query.goalId ? Number(req.query.goalId) : null;
  let rows;
  if (goalId) {
    rows = await db.select().from(performanceBodyPhotosTable)
      .where(eq(performanceBodyPhotosTable.goalId, goalId))
      .orderBy(performanceBodyPhotosTable.createdAt);
  } else {
    rows = await db.select().from(performanceBodyPhotosTable)
      .orderBy(performanceBodyPhotosTable.createdAt);
  }
  res.json(rows);
});

router.post("/performance/body-photos", async (req, res) => {
  const b = req.body;
  if (!b.tipo || !b.imageData) return res.status(400).json({ error: "tipo e imageData são obrigatórios" });
  const [row] = await db.insert(performanceBodyPhotosTable).values({
    tipo: String(b.tipo),
    imageData: String(b.imageData),
    goalId: b.goalId ? Number(b.goalId) : null,
  }).returning();
  res.json(row);
});

router.delete("/performance/body-photos/:id", async (req, res) => {
  await db.delete(performanceBodyPhotosTable).where(eq(performanceBodyPhotosTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

export default router;
