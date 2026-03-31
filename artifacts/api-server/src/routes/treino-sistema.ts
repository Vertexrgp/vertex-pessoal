import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  performanceExerciseDbTable,
  performanceWorkoutPlanTable,
  performanceWorkoutDayTable,
  performanceWorkoutDayExerciseTable,
  performanceWorkoutLogTable,
  performanceWorkoutSetLogTable,
  performanceCorpoAnaliseTable,
  performanceBodyGoalTable,
} from "@workspace/db";
import { desc, eq, and, asc, sql } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

/* ═══════════════════════════════════════════════════════════════════════════
   EXERCISE DATABASE
═══════════════════════════════════════════════════════════════════════════ */

const EXERCISE_SEED = [
  // PEITO
  { nome: "Supino Reto com Barra", grupoMuscular: "peito", musculosSecundarios: ["Tríceps", "Ombro Anterior"], tipo: "composto", nivel: "intermediario", equipamento: "barra" },
  { nome: "Supino Inclinado com Barra", grupoMuscular: "peito", musculosSecundarios: ["Tríceps", "Ombro Anterior"], tipo: "composto", nivel: "intermediario", equipamento: "barra" },
  { nome: "Supino Inclinado com Halter", grupoMuscular: "peito", musculosSecundarios: ["Tríceps"], tipo: "composto", nivel: "intermediario", equipamento: "halter" },
  { nome: "Crucifixo com Halter", grupoMuscular: "peito", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "halter" },
  { nome: "Crossover no Cabo", grupoMuscular: "peito", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "cabos" },
  { nome: "Mergulho (Paralelas)", grupoMuscular: "peito", musculosSecundarios: ["Tríceps"], tipo: "composto", nivel: "intermediario", equipamento: "peso_corporal" },
  { nome: "Flexão de Braços", grupoMuscular: "peito", musculosSecundarios: ["Tríceps", "Ombro"], tipo: "composto", nivel: "iniciante", equipamento: "peso_corporal" },
  // COSTAS
  { nome: "Barra Fixa (Pull-up)", grupoMuscular: "costas", musculosSecundarios: ["Bíceps"], tipo: "composto", nivel: "intermediario", equipamento: "peso_corporal" },
  { nome: "Puxada Frontal", grupoMuscular: "costas", musculosSecundarios: ["Bíceps"], tipo: "composto", nivel: "iniciante", equipamento: "maquina" },
  { nome: "Remada Curvada com Barra", grupoMuscular: "costas", musculosSecundarios: ["Bíceps", "Trapézio"], tipo: "composto", nivel: "intermediario", equipamento: "barra" },
  { nome: "Remada Unilateral com Halter", grupoMuscular: "costas", musculosSecundarios: ["Bíceps"], tipo: "composto", nivel: "iniciante", equipamento: "halter" },
  { nome: "Remada Cavalinho", grupoMuscular: "costas", musculosSecundarios: ["Trapézio"], tipo: "composto", nivel: "iniciante", equipamento: "maquina" },
  { nome: "Pullover com Halter", grupoMuscular: "costas", musculosSecundarios: ["Peitoral"], tipo: "isolado", nivel: "intermediario", equipamento: "halter" },
  { nome: "Remada no Cabo Baixo", grupoMuscular: "costas", musculosSecundarios: ["Bíceps"], tipo: "composto", nivel: "iniciante", equipamento: "cabos" },
  // OMBRO
  { nome: "Desenvolvimento com Barra", grupoMuscular: "ombro", musculosSecundarios: ["Tríceps"], tipo: "composto", nivel: "intermediario", equipamento: "barra" },
  { nome: "Desenvolvimento com Halter", grupoMuscular: "ombro", musculosSecundarios: ["Tríceps"], tipo: "composto", nivel: "iniciante", equipamento: "halter" },
  { nome: "Elevação Lateral com Halter", grupoMuscular: "ombro", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "halter" },
  { nome: "Elevação Frontal com Halter", grupoMuscular: "ombro", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "halter" },
  { nome: "Face Pull no Cabo", grupoMuscular: "ombro", musculosSecundarios: ["Trapézio"], tipo: "isolado", nivel: "iniciante", equipamento: "cabos" },
  { nome: "Arnold Press", grupoMuscular: "ombro", musculosSecundarios: ["Tríceps"], tipo: "composto", nivel: "intermediario", equipamento: "halter" },
  { nome: "Encolhimento com Barra (Trapézio)", grupoMuscular: "ombro", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "barra" },
  // BRAÇOS
  { nome: "Rosca Direta com Barra", grupoMuscular: "bracos", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "barra" },
  { nome: "Rosca Alternada com Halter", grupoMuscular: "bracos", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "halter" },
  { nome: "Rosca Martelo", grupoMuscular: "bracos", musculosSecundarios: ["Braquiorradial"], tipo: "isolado", nivel: "iniciante", equipamento: "halter" },
  { nome: "Rosca Concentrada", grupoMuscular: "bracos", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "halter" },
  { nome: "Rosca no Cabo", grupoMuscular: "bracos", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "cabos" },
  { nome: "Tríceps Corda no Cabo", grupoMuscular: "bracos", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "cabos" },
  { nome: "Tríceps Francês (Skull Crusher)", grupoMuscular: "bracos", musculosSecundarios: [], tipo: "isolado", nivel: "intermediario", equipamento: "barra" },
  { nome: "Tríceps Coice com Halter", grupoMuscular: "bracos", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "halter" },
  { nome: "Mergulho Banco (Tríceps)", grupoMuscular: "bracos", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "peso_corporal" },
  // PERNAS
  { nome: "Agachamento Livre", grupoMuscular: "pernas", musculosSecundarios: ["Glúteos", "Core"], tipo: "composto", nivel: "intermediario", equipamento: "barra" },
  { nome: "Leg Press 45°", grupoMuscular: "pernas", musculosSecundarios: ["Glúteos"], tipo: "composto", nivel: "iniciante", equipamento: "maquina" },
  { nome: "Cadeira Extensora", grupoMuscular: "pernas", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "maquina" },
  { nome: "Leg Curl (Mesa Flexora)", grupoMuscular: "pernas", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "maquina" },
  { nome: "Stiff com Barra", grupoMuscular: "pernas", musculosSecundarios: ["Glúteos"], tipo: "composto", nivel: "intermediario", equipamento: "barra" },
  { nome: "Afundo (Lunge)", grupoMuscular: "pernas", musculosSecundarios: ["Glúteos"], tipo: "composto", nivel: "iniciante", equipamento: "halter" },
  { nome: "Panturrilha em Pé", grupoMuscular: "pernas", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "maquina" },
  { nome: "Agachamento Hack", grupoMuscular: "pernas", musculosSecundarios: ["Glúteos"], tipo: "composto", nivel: "intermediario", equipamento: "maquina" },
  // GLÚTEOS
  { nome: "Hip Thrust com Barra", grupoMuscular: "gluteos", musculosSecundarios: ["Isquiotibiais"], tipo: "composto", nivel: "iniciante", equipamento: "barra" },
  { nome: "Elevação Pélvica", grupoMuscular: "gluteos", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "peso_corporal" },
  { nome: "Agachamento Sumô", grupoMuscular: "gluteos", musculosSecundarios: ["Adutores", "Pernas"], tipo: "composto", nivel: "iniciante", equipamento: "halter" },
  { nome: "Glúteo 4 Apoios no Cabo", grupoMuscular: "gluteos", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "cabos" },
  { nome: "Abdução de Quadril na Máquina", grupoMuscular: "gluteos", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "maquina" },
  // ABDÔMEN
  { nome: "Abdominal Crunch", grupoMuscular: "abdomen", musculosSecundarios: [], tipo: "isolado", nivel: "iniciante", equipamento: "peso_corporal" },
  { nome: "Prancha Abdominal", grupoMuscular: "abdomen", musculosSecundarios: ["Core"], tipo: "isolado", nivel: "iniciante", equipamento: "peso_corporal" },
  { nome: "Elevação de Joelhos", grupoMuscular: "abdomen", musculosSecundarios: [], tipo: "isolado", nivel: "intermediario", equipamento: "peso_corporal" },
  { nome: "Abdominal Roda (Ab Wheel)", grupoMuscular: "abdomen", musculosSecundarios: ["Core"], tipo: "isolado", nivel: "avancado", equipamento: "peso_corporal" },
];

router.get("/performance/treino/exercises", async (_req: Request, res: Response) => {
  try {
    const exercises = await db.select().from(performanceExerciseDbTable).orderBy(asc(performanceExerciseDbTable.grupoMuscular), asc(performanceExerciseDbTable.nome));
    res.json(exercises);
  } catch { res.status(500).json({ error: "Erro ao buscar exercícios" }); }
});

router.post("/performance/treino/seed-exercises", async (_req: Request, res: Response) => {
  try {
    const existing = await db.select({ id: performanceExerciseDbTable.id }).from(performanceExerciseDbTable).limit(1);
    if (existing.length > 0) { res.json({ message: "Exercícios já foram adicionados", count: existing.length }); return; }
    const rows = await db.insert(performanceExerciseDbTable).values(
      EXERCISE_SEED.map(e => ({ ...e, musculosSecundarios: e.musculosSecundarios }))
    ).returning({ id: performanceExerciseDbTable.id });
    res.json({ message: `${rows.length} exercícios adicionados`, count: rows.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

/* ═══════════════════════════════════════════════════════════════════════════
   WORKOUT PLAN
═══════════════════════════════════════════════════════════════════════════ */

async function getActivePlan() {
  const [plan] = await db.select().from(performanceWorkoutPlanTable)
    .where(eq(performanceWorkoutPlanTable.ativo, true))
    .orderBy(desc(performanceWorkoutPlanTable.createdAt)).limit(1);
  if (!plan) return null;
  const days = await db.select().from(performanceWorkoutDayTable)
    .where(eq(performanceWorkoutDayTable.planoId, plan.id))
    .orderBy(asc(performanceWorkoutDayTable.ordem));
  const dayIds = days.map(d => d.id);
  const exercises = dayIds.length > 0
    ? await db.select({ e: performanceWorkoutDayExerciseTable, ex: performanceExerciseDbTable })
        .from(performanceWorkoutDayExerciseTable)
        .leftJoin(performanceExerciseDbTable, eq(performanceWorkoutDayExerciseTable.exerciseId, performanceExerciseDbTable.id))
        .where(sql`${performanceWorkoutDayExerciseTable.diaId} = ANY(${sql`ARRAY[${sql.join(dayIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`)
        .orderBy(asc(performanceWorkoutDayExerciseTable.diaId), asc(performanceWorkoutDayExerciseTable.ordem))
    : [];
  const dayExercises: Record<number, any[]> = {};
  for (const { e, ex } of exercises) {
    if (!dayExercises[e.diaId]) dayExercises[e.diaId] = [];
    dayExercises[e.diaId].push({ ...e, exercicio: ex });
  }
  return { ...plan, dias: days.map(d => ({ ...d, exercicios: dayExercises[d.id] ?? [] })) };
}

router.get("/performance/treino/plano", async (_req: Request, res: Response) => {
  try {
    const plan = await getActivePlan();
    res.json(plan ?? null);
  } catch { res.status(500).json({ error: "Erro ao buscar plano" }); }
});

router.post("/performance/treino/plano/generate", async (req: Request, res: Response) => {
  try {
    // 1. Get context
    const [analise] = await db.select().from(performanceCorpoAnaliseTable)
      .where(eq(performanceCorpoAnaliseTable.status, "done"))
      .orderBy(desc(performanceCorpoAnaliseTable.createdAt)).limit(1);
    const [goal] = await db.select().from(performanceBodyGoalTable).limit(1);
    const exercises = await db.select().from(performanceExerciseDbTable).orderBy(asc(performanceExerciseDbTable.grupoMuscular));

    const prioridades = analise?.prioridades ?? [];
    const estrategia = analise?.estrategia;
    const exerciseList = exercises.map(e => `${e.id}:${e.nome} (${e.grupoMuscular}, ${e.tipo}, ${e.nivel})`).join("\n");

    const prompt = `Você é um personal trainer especializado em hipertrofia. Crie um plano de treino personalizado baseado nos seguintes dados:

OBJETIVO: ${estrategia?.titulo ?? "Hipertrofia e melhora corporal geral"}
ESTRATÉGIA: ${estrategia?.tipo ?? "recomposicao"}
DADOS NUMÉRICOS: Peso ${goal?.pesoAtual ?? "?"}kg → ${goal?.pesoAlvo ?? "?"}kg | BF ${goal?.bfAtual ?? "?"}% → ${goal?.bfAlvo ?? "?"}%

PRIORIDADES MUSCULARES (em ordem):
${prioridades.length > 0 ? prioridades.map(p => `${p.rank}. ${p.grupo}: ${p.descricao}`).join("\n") : "Desenvolvimento equilibrado"}

BASE DE EXERCÍCIOS DISPONÍVEIS (use os IDs na resposta):
${exerciseList}

REGRAS:
- Músculo PRIORITÁRIO (rank 1-2): 4 séries, mais exercícios, prioridade "primario"
- Músculo SECUNDÁRIO (rank 3-4): 3 séries, prioridade "secundario"  
- MANUTENÇÃO (rank 5+): 2-3 séries, prioridade "manutencao"
- Use divisão de 4-5 dias (ABCD ou ABCDE)
- Inclua 4-7 exercícios por dia
- Ordem: compostos primeiro, isolados depois
- Descanso 90-120s para compostos, 60s para isolados
- Reps: 6-10 para compostos pesados, 10-15 para isolados

Responda APENAS com JSON válido:
{
  "nome": "Nome do Plano (ex: Plano ABCD Hipertrofia Focada)",
  "divisao": "ABCD",
  "fase": "ganho_massa",
  "frequenciaSemanal": 4,
  "objetivo": "Descrição do objetivo do plano em 1-2 frases",
  "dias": [
    {
      "letra": "A",
      "diaSemana": "Segunda",
      "nome": "Treino A - Peito e Ombro",
      "focoPrincipal": "Peito e Ombro",
      "musculos": ["Peitoral", "Deltoides"],
      "exercicios": [
        {
          "exerciseId": 1,
          "nomeOverride": null,
          "grupoMuscular": "peito",
          "series": 4,
          "repsMin": 8,
          "repsMax": 12,
          "descansoSeg": 90,
          "ordem": 1,
          "prioridade": "primario",
          "observacoes": null
        }
      ]
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (message.content[0] as any)?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Resposta inválida da IA");
    const result = JSON.parse(jsonMatch[0]);

    // 2. Deactivate old plans
    await db.update(performanceWorkoutPlanTable).set({ ativo: false });

    // 3. Create plan
    const [plan] = await db.insert(performanceWorkoutPlanTable).values({
      nome: result.nome,
      divisao: result.divisao,
      fase: result.fase ?? "ganho_massa",
      frequenciaSemanal: result.frequenciaSemanal ?? 4,
      objetivo: result.objetivo ?? null,
      ativo: true,
      geradoPorIa: true,
      analiseId: analise?.id ?? null,
    }).returning();

    // 4. Create days and exercises
    for (const [i, dia] of result.dias.entries()) {
      const [day] = await db.insert(performanceWorkoutDayTable).values({
        planoId: plan.id,
        nome: dia.nome,
        letra: dia.letra,
        diaSemana: dia.diaSemana,
        focoPrincipal: dia.focoPrincipal ?? null,
        musculos: dia.musculos ?? [],
        ordem: i,
      }).returning();

      if (dia.exercicios?.length > 0) {
        await db.insert(performanceWorkoutDayExerciseTable).values(
          dia.exercicios.map((ex: any, j: number) => ({
            diaId: day.id,
            exerciseId: ex.exerciseId ?? null,
            nomeOverride: ex.nomeOverride ?? null,
            grupoMuscular: ex.grupoMuscular ?? null,
            series: ex.series ?? 3,
            repsMin: ex.repsMin ?? 8,
            repsMax: ex.repsMax ?? 12,
            descansoSeg: ex.descansoSeg ?? 90,
            ordem: ex.ordem ?? j,
            prioridade: ex.prioridade ?? "secundario",
            observacoes: ex.observacoes ?? null,
          }))
        );
      }
    }

    const fullPlan = await getActivePlan();
    res.json(fullPlan);
  } catch (err: any) {
    res.status(500).json({ error: "Falha ao gerar plano: " + (err?.message ?? "erro") });
  }
});

router.delete("/performance/treino/plano/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await db.update(performanceWorkoutPlanTable).set({ ativo: false }).where(eq(performanceWorkoutPlanTable.id, id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Erro ao remover plano" }); }
});

/* ═══════════════════════════════════════════════════════════════════════════
   WORKOUT LOGS (SESSION TRACKING)
═══════════════════════════════════════════════════════════════════════════ */

router.get("/performance/treino/logs", async (_req: Request, res: Response) => {
  try {
    const logs = await db.select({ log: performanceWorkoutLogTable, dia: performanceWorkoutDayTable })
      .from(performanceWorkoutLogTable)
      .leftJoin(performanceWorkoutDayTable, eq(performanceWorkoutLogTable.diaId, performanceWorkoutDayTable.id))
      .orderBy(desc(performanceWorkoutLogTable.data))
      .limit(30);
    res.json(logs.map(({ log, dia }) => ({ ...log, dia })));
  } catch { res.status(500).json({ error: "Erro ao buscar histórico" }); }
});

router.post("/performance/treino/logs", async (req: Request, res: Response) => {
  try {
    const { diaId, planoId, data } = req.body;
    if (!data) return res.status(400).json({ error: "data é obrigatória" });

    // Load exercises for this day to pre-populate sets
    const diaExercises = diaId
      ? await db.select().from(performanceWorkoutDayExerciseTable)
          .leftJoin(performanceExerciseDbTable, eq(performanceWorkoutDayExerciseTable.exerciseId, performanceExerciseDbTable.id))
          .where(eq(performanceWorkoutDayExerciseTable.diaId, Number(diaId)))
          .orderBy(asc(performanceWorkoutDayExerciseTable.ordem))
      : [];

    const [log] = await db.insert(performanceWorkoutLogTable).values({
      diaId: diaId ? Number(diaId) : null,
      planoId: planoId ? Number(planoId) : null,
      data: String(data),
      concluido: false,
    }).returning();

    // Pre-populate set logs from plan
    if (diaExercises.length > 0) {
      const setRows: any[] = [];
      for (const { performance_workout_day_exercise: ex, performance_exercise_db: exDb } of diaExercises) {
        const nome = ex.nomeOverride ?? exDb?.nome ?? "Exercício";
        const grupo = ex.grupoMuscular ?? exDb?.grupoMuscular ?? null;
        for (let s = 1; s <= ex.series; s++) {
          setRows.push({
            logId: log.id,
            diaExercicioId: ex.id,
            nomeExercicio: nome,
            grupoMuscular: grupo,
            numeroSerie: s,
            concluido: false,
          });
        }
      }
      if (setRows.length > 0) await db.insert(performanceWorkoutSetLogTable).values(setRows);
    }

    res.json({ ...log, series: diaExercises.length > 0 ? "pre-populated" : "empty" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/performance/treino/logs/:logId", async (req: Request, res: Response) => {
  const logId = Number(req.params.logId);
  try {
    const [log] = await db.select({ log: performanceWorkoutLogTable, dia: performanceWorkoutDayTable })
      .from(performanceWorkoutLogTable)
      .leftJoin(performanceWorkoutDayTable, eq(performanceWorkoutLogTable.diaId, performanceWorkoutDayTable.id))
      .where(eq(performanceWorkoutLogTable.id, logId)).limit(1);
    if (!log) return res.status(404).json({ error: "Log não encontrado" });

    const sets = await db.select().from(performanceWorkoutSetLogTable)
      .where(eq(performanceWorkoutSetLogTable.logId, logId))
      .orderBy(asc(performanceWorkoutSetLogTable.nomeExercicio), asc(performanceWorkoutSetLogTable.numeroSerie));

    res.json({ ...log.log, dia: log.dia, series: sets });
  } catch { res.status(500).json({ error: "Erro ao buscar log" }); }
});

router.patch("/performance/treino/logs/:logId", async (req: Request, res: Response) => {
  const logId = Number(req.params.logId);
  try {
    const b = req.body;
    const [updated] = await db.update(performanceWorkoutLogTable).set({
      concluido: b.concluido !== undefined ? Boolean(b.concluido) : undefined,
      duracaoMin: b.duracaoMin !== undefined ? Number(b.duracaoMin) : undefined,
      observacoes: b.observacoes !== undefined ? String(b.observacoes) : undefined,
    }).where(eq(performanceWorkoutLogTable.id, logId)).returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Erro ao atualizar log" }); }
});

router.patch("/performance/treino/sets/:setId", async (req: Request, res: Response) => {
  const setId = Number(req.params.setId);
  try {
    const b = req.body;
    const [updated] = await db.update(performanceWorkoutSetLogTable).set({
      cargaKg: b.cargaKg !== undefined ? (b.cargaKg !== null && b.cargaKg !== "" ? String(Number(b.cargaKg)) : null) : undefined,
      reps: b.reps !== undefined ? (b.reps !== null ? Number(b.reps) : null) : undefined,
      concluido: b.concluido !== undefined ? Boolean(b.concluido) : undefined,
    }).where(eq(performanceWorkoutSetLogTable.id, setId)).returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Erro ao atualizar série" }); }
});

/* ═══════════════════════════════════════════════════════════════════════════
   PROGRESSION (evolution per exercise)
═══════════════════════════════════════════════════════════════════════════ */

router.get("/performance/treino/progressao", async (_req: Request, res: Response) => {
  try {
    // Get all completed sets grouped by exercise name
    const sets = await db
      .select({
        nomeExercicio: performanceWorkoutSetLogTable.nomeExercicio,
        grupoMuscular: performanceWorkoutSetLogTable.grupoMuscular,
        data: performanceWorkoutLogTable.data,
        cargaKg: performanceWorkoutSetLogTable.cargaKg,
        reps: performanceWorkoutSetLogTable.reps,
        numeroSerie: performanceWorkoutSetLogTable.numeroSerie,
      })
      .from(performanceWorkoutSetLogTable)
      .innerJoin(performanceWorkoutLogTable, eq(performanceWorkoutSetLogTable.logId, performanceWorkoutLogTable.id))
      .where(and(
        eq(performanceWorkoutSetLogTable.concluido, true),
        sql`${performanceWorkoutSetLogTable.cargaKg} IS NOT NULL`
      ))
      .orderBy(asc(performanceWorkoutSetLogTable.nomeExercicio), asc(performanceWorkoutLogTable.data));

    // Group by exercise
    const byExercise: Record<string, { grupo: string; entradas: { data: string; maxCarga: number; avgReps: number }[] }> = {};
    const byDateExercise: Record<string, Record<string, { cargas: number[]; reps: number[] }>> = {};

    for (const s of sets) {
      if (!s.nomeExercicio || !s.cargaKg || !s.data) continue;
      const nome = s.nomeExercicio;
      const data = s.data;
      if (!byDateExercise[nome]) byDateExercise[nome] = {};
      if (!byDateExercise[nome][data]) byDateExercise[nome][data] = { cargas: [], reps: [] };
      byDateExercise[nome][data].cargas.push(Number(s.cargaKg));
      if (s.reps) byDateExercise[nome][data].reps.push(s.reps);
    }

    for (const [nome, byDate] of Object.entries(byDateExercise)) {
      const grupo = sets.find(s => s.nomeExercicio === nome)?.grupoMuscular ?? "?";
      byExercise[nome] = {
        grupo,
        entradas: Object.entries(byDate).map(([data, v]) => ({
          data,
          maxCarga: Math.max(...v.cargas),
          avgReps: v.reps.length > 0 ? Math.round(v.reps.reduce((a, b) => a + b, 0) / v.reps.length) : 0,
        })).sort((a, b) => a.data.localeCompare(b.data)),
      };
    }

    res.json(byExercise);
  } catch { res.status(500).json({ error: "Erro ao buscar progressão" }); }
});

/* ═══════════════════════════════════════════════════════════════════════════
   AUTO-PROGRESSION SUGGESTIONS
═══════════════════════════════════════════════════════════════════════════ */

router.get("/performance/treino/sugestoes-progressao", async (_req: Request, res: Response) => {
  try {
    // Find exercises where user consistently hit top of rep range
    const recentSets = await db
      .select({
        nomeExercicio: performanceWorkoutSetLogTable.nomeExercicio,
        cargaKg: performanceWorkoutSetLogTable.cargaKg,
        reps: performanceWorkoutSetLogTable.reps,
        diaExercicioId: performanceWorkoutSetLogTable.diaExercicioId,
        data: performanceWorkoutLogTable.data,
      })
      .from(performanceWorkoutSetLogTable)
      .innerJoin(performanceWorkoutLogTable, eq(performanceWorkoutSetLogTable.logId, performanceWorkoutLogTable.id))
      .where(and(eq(performanceWorkoutSetLogTable.concluido, true), sql`${performanceWorkoutSetLogTable.reps} IS NOT NULL`))
      .orderBy(desc(performanceWorkoutLogTable.data))
      .limit(200);

    const exerciseData: Record<string, { cargaKg: number; reps: number[]; diaExercicioId: number | null }[]> = {};
    for (const s of recentSets) {
      if (!s.nomeExercicio || !s.reps) continue;
      if (!exerciseData[s.nomeExercicio]) exerciseData[s.nomeExercicio] = [];
      exerciseData[s.nomeExercicio].push({ cargaKg: Number(s.cargaKg ?? 0), reps: [s.reps], diaExercicioId: s.diaExercicioId });
    }

    // Get target reps for each exercise
    const exerciseTargets: Record<number, { repsMin: number; repsMax: number }> = {};
    if (Object.values(exerciseData).some(v => v[0]?.diaExercicioId)) {
      const targets = await db.select({ id: performanceWorkoutDayExerciseTable.id, repsMin: performanceWorkoutDayExerciseTable.repsMin, repsMax: performanceWorkoutDayExerciseTable.repsMax })
        .from(performanceWorkoutDayExerciseTable);
      for (const t of targets) exerciseTargets[t.id] = { repsMin: t.repsMin, repsMax: t.repsMax };
    }

    const sugestoes: { exercicio: string; acao: string; motivo: string; novaCarga?: number }[] = [];
    for (const [nome, sessions] of Object.entries(exerciseData)) {
      if (sessions.length < 2) continue;
      const lastSession = sessions[0];
      const diaEx = lastSession.diaExercicioId ? exerciseTargets[lastSession.diaExercicioId] : null;
      const repsMax = diaEx?.repsMax ?? 12;
      const avgReps = lastSession.reps[0];
      const carga = lastSession.cargaKg;

      if (avgReps >= repsMax) {
        sugestoes.push({
          exercicio: nome,
          acao: "aumentar_carga",
          motivo: `Você executou ${avgReps} reps (acima do alvo ${repsMax}). Aumente a carga em 2-5%.`,
          novaCarga: Math.round(carga * 1.025 * 2) / 2, // round to 0.5
        });
      } else if (sessions.length >= 3 && sessions.slice(0, 3).every(s => s.reps[0] < (diaEx?.repsMin ?? 8))) {
        sugestoes.push({
          exercicio: nome,
          acao: "reduzir_carga",
          motivo: `Você está abaixo do mínimo de reps nas últimas 3 sessões. Reduza a carga.`,
        });
      } else {
        sugestoes.push({
          exercicio: nome,
          acao: "manter_carga",
          motivo: `Progresso adequado. Mantenha a carga atual de ${carga}kg.`,
        });
      }
    }

    res.json(sugestoes);
  } catch { res.status(500).json({ error: "Erro ao calcular sugestões" }); }
});

export default router;
