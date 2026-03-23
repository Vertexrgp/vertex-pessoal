import { Router } from "express";
import { db } from "@workspace/db";
import {
  sugestoesTable,
  comportamentoLogsTable,
  agendaPlannerTasksTable,
  budgetItemsTable,
  growthCheckpoints,
  growthGoals,
  performanceProgressTable,
  performanceWorkoutsTable,
} from "@workspace/db";
import { eq, and, lt, lte, ne, desc, sql, isNull } from "drizzle-orm";

const router = Router();

// ─── Listar sugestões ──────────────────────────────────────────────────────────

router.get("/sugestoes", async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.select().from(sugestoesTable).orderBy(desc(sugestoesTable.geradaEm));
    const items = status
      ? await db.select().from(sugestoesTable).where(eq(sugestoesTable.status, String(status))).orderBy(desc(sugestoesTable.geradaEm))
      : await db.select().from(sugestoesTable).orderBy(desc(sugestoesTable.geradaEm));
    res.json(items);
  } catch {
    res.status(500).json({ error: "Erro ao buscar sugestões" });
  }
});

// ─── Estatísticas de comportamento ────────────────────────────────────────────

router.get("/sugestoes/comportamento", async (_req, res) => {
  try {
    const logs = await db.select().from(comportamentoLogsTable).orderBy(desc(comportamentoLogsTable.createdAt));
    const total = logs.length;
    const aceitas = logs.filter(l => l.tipo === "sugestao_aceita").length;
    const ignoradas = logs.filter(l => l.tipo === "sugestao_ignorada").length;

    const porModulo: Record<string, { aceitas: number; ignoradas: number }> = {};
    for (const log of logs) {
      if (!porModulo[log.modulo]) porModulo[log.modulo] = { aceitas: 0, ignoradas: 0 };
      if (log.tipo === "sugestao_aceita") porModulo[log.modulo].aceitas++;
      if (log.tipo === "sugestao_ignorada") porModulo[log.modulo].ignoradas++;
    }

    res.json({ total, aceitas, ignoradas, taxaAceitacao: total ? Math.round((aceitas / total) * 100) : 0, porModulo, logs: logs.slice(0, 20) });
  } catch {
    res.status(500).json({ error: "Erro ao buscar comportamento" });
  }
});

// ─── Aplicar sugestão ─────────────────────────────────────────────────────────

router.patch("/sugestoes/:id/aplicar", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(sugestoesTable)
      .set({ status: "aplicada", respondidaEm: new Date() })
      .where(eq(sugestoesTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Sugestão não encontrada" });

    await db.insert(comportamentoLogsTable).values({
      tipo: "sugestao_aceita",
      modulo: updated.modulo,
      sugestaoId: id,
      dados: { titulo: updated.titulo, confianca: updated.confianca },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao aplicar sugestão" });
  }
});

// ─── Ignorar sugestão ─────────────────────────────────────────────────────────

router.patch("/sugestoes/:id/ignorar", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(sugestoesTable)
      .set({ status: "ignorada", respondidaEm: new Date() })
      .where(eq(sugestoesTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Sugestão não encontrada" });

    await db.insert(comportamentoLogsTable).values({
      tipo: "sugestao_ignorada",
      modulo: updated.modulo,
      sugestaoId: id,
      dados: { titulo: updated.titulo, confianca: updated.confianca },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao ignorar sugestão" });
  }
});

// ─── Motor de Geração de Sugestões ────────────────────────────────────────────

async function gerarSugestoes(): Promise<{ geradas: number; categorias: string[] }> {
  const novas: typeof sugestoesTable.$inferInsert[] = [];
  const hoje = new Date();
  const hojeDateStr = hoje.toISOString().split("T")[0];

  const semanaAtras = new Date(hoje);
  semanaAtras.setDate(hoje.getDate() - 7);
  const semanaAtrasStr = semanaAtras.toISOString().split("T")[0];

  const duasSemanas = new Date(hoje);
  duasSemanas.setDate(hoje.getDate() - 14);

  // Buscar logs de comportamento para personalizar confiança
  const logsRecentes = await db.select().from(comportamentoLogsTable).orderBy(desc(comportamentoLogsTable.createdAt)).limit(50);
  const aceitasPorModulo: Record<string, number> = {};
  const ignoradasPorModulo: Record<string, number> = {};
  for (const log of logsRecentes) {
    if (log.tipo === "sugestao_aceita") aceitasPorModulo[log.modulo] = (aceitasPorModulo[log.modulo] || 0) + 1;
    if (log.tipo === "sugestao_ignorada") ignoradasPorModulo[log.modulo] = (ignoradasPorModulo[log.modulo] || 0) + 1;
  }

  function confiancaModulo(modulo: string): string {
    const aceitas = aceitasPorModulo[modulo] || 0;
    const ignoradas = ignoradasPorModulo[modulo] || 0;
    if (aceitas >= 3) return "alta";
    if (ignoradas >= 3) return "baixa";
    return "media";
  }

  // ── AGENDA: Tarefas postergadas ──────────────────────────────────────────────
  try {
    const tarefasPostergadas = await db
      .select()
      .from(agendaPlannerTasksTable)
      .where(
        and(
          ne(agendaPlannerTasksTable.status, "concluida"),
          sql`${agendaPlannerTasksTable.postergadaCount} >= 2`,
        )
      )
      .limit(5);

    for (const t of tarefasPostergadas) {
      novas.push({
        modulo: "agenda",
        titulo: `Tarefa postergada ${t.postergadaCount}x: "${t.titulo}"`,
        explicacao: `A tarefa "${t.titulo}" foi adiada ${t.postergadaCount} vezes e ainda está pendente. Isso pode indicar que a tarefa é grande demais ou está no momento errado.`,
        motivo: `Postergamento recorrente detectado (${t.postergadaCount} vezes)`,
        impacto: "Resolver isso libera sua lista de pendências e reduz carga cognitiva",
        confianca: t.postergadaCount >= 4 ? "alta" : confiancaModulo("agenda"),
        metadados: { tarefaId: t.id, postergadaCount: t.postergadaCount },
      });
    }

    // Tarefas antigas sem completar
    const tarefasAntigas = await db
      .select()
      .from(agendaPlannerTasksTable)
      .where(
        and(
          ne(agendaPlannerTasksTable.status, "concluida"),
          lte(agendaPlannerTasksTable.semanaInicio, semanaAtrasStr),
        )
      )
      .limit(3);

    if (tarefasAntigas.length >= 3) {
      novas.push({
        modulo: "agenda",
        titulo: `${tarefasAntigas.length} tarefas de semanas anteriores sem conclusão`,
        explicacao: `Você tem ${tarefasAntigas.length} tarefas de semanas anteriores que ainda não foram concluídas. Sugiro revisar quais ainda são relevantes e quais podem ser arquivadas.`,
        motivo: "Acúmulo de tarefas de semanas passadas detectado",
        impacto: "Limpeza da lista aumenta foco e clareza nos objetivos semanais",
        confianca: confiancaModulo("agenda"),
        metadados: { tarefasIds: tarefasAntigas.map(t => t.id) },
      });
    }

    // Tarefas de alta prioridade sem foco
    const altaPrioridadeSemFoco = await db
      .select()
      .from(agendaPlannerTasksTable)
      .where(
        and(
          eq(agendaPlannerTasksTable.prioridade, "alta"),
          eq(agendaPlannerTasksTable.isFoco, false),
          ne(agendaPlannerTasksTable.status, "concluida"),
        )
      )
      .limit(3);

    if (altaPrioridadeSemFoco.length > 0) {
      const nomes = altaPrioridadeSemFoco.slice(0, 2).map(t => `"${t.titulo}"`).join(", ");
      novas.push({
        modulo: "agenda",
        titulo: `Definir foco do dia para tarefas de alta prioridade`,
        explicacao: `Você tem ${altaPrioridadeSemFoco.length} tarefa(s) de alta prioridade sem "foco" ativado: ${nomes}. Marcar uma como foco do dia ajuda na concentração.`,
        motivo: "Tarefas de alta prioridade sem foco detectadas",
        impacto: "Aumenta produtividade diária com atenção concentrada na tarefa mais importante",
        confianca: confiancaModulo("agenda"),
        metadados: { tarefasIds: altaPrioridadeSemFoco.map(t => t.id) },
      });
    }
  } catch {}

  // ── FINANCEIRO: Budget items estourados ──────────────────────────────────────
  try {
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    const budgetItems = await db
      .select()
      .from(budgetItemsTable)
      .where(
        and(
          eq(budgetItemsTable.month, mesAtual),
          eq(budgetItemsTable.year, anoAtual),
        )
      );

    const estourados = budgetItems.filter(b => {
      const planejado = parseFloat(String(b.plannedAmount || "0"));
      const realizado = parseFloat(String(b.realizedAmount || "0"));
      return planejado > 0 && realizado > planejado;
    });

    for (const item of estourados.slice(0, 3)) {
      const planejado = parseFloat(String(item.plannedAmount));
      const realizado = parseFloat(String(item.realizedAmount));
      const excesso = realizado - planejado;
      const pct = Math.round((excesso / planejado) * 100);

      novas.push({
        modulo: "financeiro",
        titulo: `Orçamento estourado: "${item.description}" (+${pct}%)`,
        explicacao: `O item "${item.description}" ultrapassou o orçamento planejado em R$ ${excesso.toFixed(2)} (${pct}% acima do previsto). Revise gastos nesta categoria ou ajuste o planejamento.`,
        motivo: `Gasto realizado (R$ ${realizado.toFixed(2)}) supera planejado (R$ ${planejado.toFixed(2)})`,
        impacto: "Controlar este desvio evita desbalancear o planejamento financeiro do mês",
        confianca: pct >= 30 ? "alta" : confiancaModulo("financeiro"),
        metadados: { budgetItemId: item.id, planejado, realizado, excesso, pct },
      });
    }

    // Itens com realizado zero mas planejado alto (provavelmente esquecido)
    const esquecidos = budgetItems.filter(b => {
      const planejado = parseFloat(String(b.plannedAmount || "0"));
      const realizado = parseFloat(String(b.realizedAmount || "0"));
      return planejado > 500 && realizado === 0;
    });

    if (esquecidos.length > 0) {
      novas.push({
        modulo: "financeiro",
        titulo: `${esquecidos.length} item(ns) do orçamento sem lançamentos registrados`,
        explicacao: `Existem ${esquecidos.length} item(ns) do orçamento com valor planejado mas nenhum lançamento registrado este mês. Verifique se os dados estão sendo registrados corretamente.`,
        motivo: "Items com planejamento significativo e sem registros no mês atual",
        impacto: "Manter os registros atualizados garante visão real das suas finanças",
        confianca: confiancaModulo("financeiro"),
        metadados: { ids: esquecidos.map(e => e.id) },
      });
    }
  } catch {}

  // ── CRESCIMENTO: Checkpoints atrasados ───────────────────────────────────────
  try {
    const checkpointsAtrasados = await db
      .select({ cp: growthCheckpoints, meta: growthGoals })
      .from(growthCheckpoints)
      .leftJoin(growthGoals, eq(growthCheckpoints.goalId, growthGoals.id))
      .where(
        and(
          ne(growthCheckpoints.status, "concluido"),
          sql`${growthCheckpoints.data} < ${hojeDateStr}`,
          sql`${growthCheckpoints.data} IS NOT NULL`,
        )
      )
      .limit(5);

    for (const { cp, meta } of checkpointsAtrasados) {
      const diasAtraso = Math.floor((hoje.getTime() - new Date(cp.data!).getTime()) / (1000 * 60 * 60 * 24));

      novas.push({
        modulo: "crescimento",
        titulo: `Checkpoint atrasado ${diasAtraso}d: "${cp.titulo}"`,
        explicacao: `O checkpoint "${cp.titulo}"${meta ? ` da meta "${meta.titulo}"` : ""} está ${diasAtraso} dia(s) atrasado e com progresso em ${cp.progresso}%. Revise o planejamento ou atualize o status.`,
        motivo: `Prazo expirado em ${diasAtraso} dia(s) com progresso parcial`,
        impacto: "Checkpoints em dia mantêm o ritmo das suas metas de longo prazo",
        confianca: diasAtraso >= 14 ? "alta" : confiancaModulo("crescimento"),
        metadados: { checkpointId: cp.id, goalId: cp.goalId, diasAtraso, progresso: cp.progresso },
      });
    }

    // Metas sem checkpoints
    const todasMetas = await db.select().from(growthGoals).where(eq(growthGoals.status, "ativa"));
    for (const meta of todasMetas) {
      const cps = await db.select().from(growthCheckpoints).where(eq(growthCheckpoints.goalId, meta.id));
      if (cps.length === 0) {
        novas.push({
          modulo: "crescimento",
          titulo: `Meta sem checkpoints: "${meta.titulo}"`,
          explicacao: `A meta "${meta.titulo}" não possui nenhum checkpoint definido. Criar marcos intermediários ajuda a medir o progresso e manter a motivação.`,
          motivo: "Meta ativa sem marcos mensuráveis de progresso",
          impacto: "Checkpoints transformam uma meta distante em passos concretos e alcançáveis",
          confianca: confiancaModulo("crescimento"),
          metadados: { goalId: meta.id },
        });
        break;
      }
    }
  } catch {}

  // ── PERFORMANCE: Progresso sem registros recentes ────────────────────────────
  try {
    const progressos = await db
      .select()
      .from(performanceProgressTable)
      .orderBy(desc(performanceProgressTable.data))
      .limit(1);

    if (progressos.length === 0) {
      novas.push({
        modulo: "performance",
        titulo: "Nenhum registro de progresso físico encontrado",
        explicacao: "Você ainda não registrou nenhuma medição de progresso físico (peso, % gordura, etc). Registrar periodicamente permite acompanhar a evolução rumo ao seu objetivo.",
        motivo: "Ausência total de registros de progresso físico",
        impacto: "Registrar seu progresso semanalemente permite ajustes precisos no treino e nutrição",
        confianca: "alta",
        metadados: {},
      });
    } else {
      const ultimo = progressos[0];
      const diasSemRegistro = Math.floor((hoje.getTime() - new Date(ultimo.data).getTime()) / (1000 * 60 * 60 * 24));
      if (diasSemRegistro >= 14) {
        novas.push({
          modulo: "performance",
          titulo: `${diasSemRegistro} dias sem registrar progresso físico`,
          explicacao: `Seu último registro de progresso foi há ${diasSemRegistro} dias. Para acompanhar sua evolução física com precisão, recomenda-se registrar pelo menos 1x por semana.`,
          motivo: `Último registro em ${new Date(ultimo.data).toLocaleDateString("pt-BR")}`,
          impacto: "Monitoramento regular permite ajustes proativos de treino e nutrição",
          confianca: diasSemRegistro >= 30 ? "alta" : "media",
          metadados: { diasSemRegistro, ultimoRegistro: ultimo.data },
        });
      }
    }

    // Treinos inativos
    const treinos = await db.select().from(performanceWorkoutsTable).where(eq(performanceWorkoutsTable.ativo, true));
    if (treinos.length === 0) {
      novas.push({
        modulo: "performance",
        titulo: "Nenhum protocolo de treino ativo configurado",
        explicacao: "Você não possui nenhum treino ativo configurado. Definir um protocolo de treino é o primeiro passo para atingir seus objetivos físicos.",
        motivo: "Ausência de treinos ativos na seção Performance",
        impacto: "Um protocolo de treino estruturado maximiza resultados e evita estagnação",
        confianca: "alta",
        metadados: {},
      });
    }
  } catch {}

  // Inserir apenas se houver novas (evitar duplicatas recentes)
  const sugestoesExistentes = await db
    .select()
    .from(sugestoesTable)
    .where(eq(sugestoesTable.status, "pendente"));

  const titulosExistentes = new Set(sugestoesExistentes.map(s => s.titulo));
  const paraInserir = novas.filter(s => !titulosExistentes.has(s.titulo));

  if (paraInserir.length > 0) {
    await db.insert(sugestoesTable).values(paraInserir);
  }

  const categorias = [...new Set(paraInserir.map(s => s.modulo))];
  return { geradas: paraInserir.length, categorias };
}

// ─── Endpoint para gerar sugestões ────────────────────────────────────────────

router.post("/sugestoes/gerar", async (_req, res) => {
  try {
    const resultado = await gerarSugestoes();
    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar sugestões" });
  }
});

export default router;
