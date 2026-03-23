import { Router } from "express";
import { db } from "@workspace/db";
import {
  agendaPlannerTasksTable,
  agendaEventsTable,
  budgetItemsTable,
  growthGoals,
  growthCheckpoints,
  performanceWorkoutsTable,
  performanceProgressTable,
  performanceBodyGoalTable,
  transactionsTable,
  assetsTable,
  receivablesTable,
  debtsTable,
} from "@workspace/db";
import { eq, and, ne, lte, desc, sql, gt } from "drizzle-orm";

const router = Router();

router.get("/dashboard/global", async (_req, res) => {
  try {
    const hoje = new Date();
    const hojeDateStr = hoje.toISOString().split("T")[0];
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    const semanaInicio = new Date(hoje);
    semanaInicio.setDate(hoje.getDate() - hoje.getDay());
    const semanaInicioStr = semanaInicio.toISOString().split("T")[0];

    const seteDiasAtras = new Date(hoje);
    seteDiasAtras.setDate(hoje.getDate() - 7);
    const seteDiasAtrasStr = seteDiasAtras.toISOString().split("T")[0];

    const quatorzeAtras = new Date(hoje);
    quatorzeAtras.setDate(hoje.getDate() - 14);
    const quatorzeAtrasStr = quatorzeAtras.toISOString().split("T")[0];

    // ── HOJE ──────────────────────────────────────────────────────────────────

    const todasTarefas = await db.select().from(agendaPlannerTasksTable)
      .where(ne(agendaPlannerTasksTable.status, "concluida"))
      .orderBy(desc(agendaPlannerTasksTable.prioridade));

    const tarefasFoco = todasTarefas.filter(t => t.isFoco).slice(0, 3);
    const tarefasCriticas = todasTarefas.filter(t => t.prioridade === "alta" && !t.isFoco).slice(0, 3);
    const tarefasPostergadas = todasTarefas.filter(t => t.postergadaCount >= 2).slice(0, 4);

    const proximosEventos = await db.select().from(agendaEventsTable)
      .where(and(
        sql`${agendaEventsTable.data} >= ${hojeDateStr}`,
        sql`${agendaEventsTable.data} <= ${new Date(hoje.getTime() + 7 * 86400000).toISOString().split("T")[0]}`
      ))
      .orderBy(agendaEventsTable.data)
      .limit(4);

    // ── ALERTAS ───────────────────────────────────────────────────────────────

    const alertas: {
      tipo: string;
      modulo: string;
      titulo: string;
      detalhe: string;
      nivel: "critico" | "atencao" | "info";
    }[] = [];

    // Tarefas muito postergadas
    const muitoPostergadas = todasTarefas.filter(t => t.postergadaCount >= 3);
    if (muitoPostergadas.length > 0) {
      alertas.push({
        tipo: "tarefas_postergadas",
        modulo: "agenda",
        titulo: `${muitoPostergadas.length} tarefa(s) postergada(s) 3+ vezes`,
        detalhe: muitoPostergadas.slice(0, 2).map(t => t.titulo).join(", "),
        nivel: "critico",
      });
    }

    // Tarefas sem foco definido
    const semFoco = todasTarefas.filter(t => t.prioridade === "alta" && !t.isFoco && t.postergadaCount < 2);
    if (semFoco.length >= 3) {
      alertas.push({
        tipo: "sem_foco",
        modulo: "agenda",
        titulo: `${semFoco.length} tarefa(s) de alta prioridade sem foco`,
        detalhe: "Defina o foco do dia para manter a produtividade",
        nivel: "atencao",
      });
    }

    // Budget estourado
    const budgetItems = await db.select().from(budgetItemsTable)
      .where(and(
        eq(budgetItemsTable.month, mesAtual),
        eq(budgetItemsTable.year, anoAtual),
      ));

    const estourados = budgetItems.filter(b => {
      const p = parseFloat(String(b.plannedAmount || "0"));
      const r = parseFloat(String(b.realizedAmount || "0"));
      return p > 0 && r > p;
    });

    if (estourados.length > 0) {
      const totalExcesso = estourados.reduce((acc, b) => {
        return acc + parseFloat(String(b.realizedAmount || "0")) - parseFloat(String(b.plannedAmount || "0"));
      }, 0);
      alertas.push({
        tipo: "budget_estourado",
        modulo: "financeiro",
        titulo: `${estourados.length} categoria(s) acima do orçamento`,
        detalhe: `Excesso total de R$ ${totalExcesso.toFixed(2)}`,
        nivel: estourados.length >= 3 ? "critico" : "atencao",
      });
    }

    // Checkpoints atrasados
    const checkpointsAtrasados = await db.select({ cp: growthCheckpoints, meta: growthGoals })
      .from(growthCheckpoints)
      .leftJoin(growthGoals, eq(growthCheckpoints.goalId, growthGoals.id))
      .where(and(
        ne(growthCheckpoints.status, "concluido"),
        sql`${growthCheckpoints.data} < ${hojeDateStr}`,
        sql`${growthCheckpoints.data} IS NOT NULL`,
      ));

    if (checkpointsAtrasados.length > 0) {
      alertas.push({
        tipo: "checkpoints_atrasados",
        modulo: "crescimento",
        titulo: `${checkpointsAtrasados.length} checkpoint(s) em atraso`,
        detalhe: checkpointsAtrasados.slice(0, 2).map(r => r.cp.titulo).join(", "),
        nivel: "atencao",
      });
    }

    // Progresso físico desatualizado
    const ultimoProgresso = await db.select().from(performanceProgressTable)
      .orderBy(desc(performanceProgressTable.data)).limit(1);

    if (ultimoProgresso.length === 0) {
      alertas.push({
        tipo: "sem_progresso",
        modulo: "performance",
        titulo: "Nenhum registro de progresso físico",
        detalhe: "Registre seu progresso para acompanhar a evolução",
        nivel: "info",
      });
    } else {
      const dias = Math.floor((hoje.getTime() - new Date(ultimoProgresso[0].data).getTime()) / 86400000);
      if (dias >= 14) {
        alertas.push({
          tipo: "progresso_desatualizado",
          modulo: "performance",
          titulo: `${dias} dias sem registrar progresso físico`,
          detalhe: `Último: ${new Date(ultimoProgresso[0].data).toLocaleDateString("pt-BR")}`,
          nivel: dias >= 30 ? "atencao" : "info",
        });
      }
    }

    // ── FINANCEIRO ────────────────────────────────────────────────────────────

    const [incomeResult] = await db.select({ total: sql<number>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.type, "income"),
        sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${mesAtual}`,
        sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${anoAtual}`,
      ));

    const [expenseResult] = await db.select({ total: sql<number>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.type, "expense"),
        sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${mesAtual}`,
        sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${anoAtual}`,
      ));

    const [assetsResult] = await db.select({ total: sql<number>`COALESCE(SUM(${assetsTable.amount}), 0)` })
      .from(assetsTable).where(eq(assetsTable.status, "active"));

    const [debtsResult] = await db.select({ total: sql<number>`COALESCE(SUM(${debtsTable.remainingAmount}), 0)` })
      .from(debtsTable).where(eq(debtsTable.status, "active"));

    const totalIncome = Number(incomeResult?.total ?? 0);
    const totalExpenses = Number(expenseResult?.total ?? 0);
    const saldoMes = totalIncome - totalExpenses;

    const totalBudgetPlanejado = budgetItems.reduce((s, b) => s + parseFloat(String(b.plannedAmount || "0")), 0);
    const totalBudgetRealizado = budgetItems.reduce((s, b) => s + parseFloat(String(b.realizedAmount || "0")), 0);
    const pctOrcamento = totalBudgetPlanejado > 0
      ? Math.round((totalBudgetRealizado / totalBudgetPlanejado) * 100)
      : 0;

    // ── PERFORMANCE ───────────────────────────────────────────────────────────

    const diaSemana = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][hoje.getDay()];
    const treinos = await db.select().from(performanceWorkoutsTable)
      .where(eq(performanceWorkoutsTable.ativo, true));

    const treinoHoje = treinos.find(t =>
      t.diaSemana?.toLowerCase().includes(diaSemana.toLowerCase().slice(0, 3))
    ) ?? null;

    const progressos7dias = await db.select().from(performanceProgressTable)
      .where(sql`${performanceProgressTable.data} >= ${seteDiasAtrasStr}`)
      .orderBy(desc(performanceProgressTable.data));

    const objetivoFisico = await db.select().from(performanceBodyGoalTable).limit(1);

    // ── DIREÇÃO (CRESCIMENTO) ─────────────────────────────────────────────────

    const metasAtivas = await db.select().from(growthGoals)
      .where(eq(growthGoals.status, "ativa"));

    const todosCheckpoints = await db.select().from(growthCheckpoints)
      .orderBy(growthCheckpoints.data);

    const metasComStatus = metasAtivas.map(meta => {
      const cps = todosCheckpoints.filter(c => c.goalId === meta.id);
      const emRisco = cps.some(c =>
        c.status !== "concluido" && c.data && new Date(c.data) < new Date(hoje.getTime() + 7 * 86400000)
      );
      const atrasado = checkpointsAtrasados.some(r => r.cp.goalId === meta.id);
      const proximoCheckpoint = cps
        .filter(c => c.status !== "concluido" && c.data)
        .sort((a, b) => (a.data || "") < (b.data || "") ? -1 : 1)[0] ?? null;

      return {
        id: meta.id,
        titulo: meta.titulo,
        tipo: meta.tipo,
        progresso: meta.progresso,
        prazo: meta.prazo,
        cor: meta.cor,
        atrasado,
        emRisco,
        proximoCheckpoint: proximoCheckpoint
          ? { titulo: proximoCheckpoint.titulo, data: proximoCheckpoint.data, status: proximoCheckpoint.status }
          : null,
        totalCheckpoints: cps.length,
        checkpointsConcluidos: cps.filter(c => c.status === "concluido" || c.concluido).length,
      };
    });

    res.json({
      hoje: {
        data: hojeDateStr,
        diaSemana,
        tarefasFoco,
        tarefasCriticas,
        tarefasPostergadas,
        proximosEventos,
      },
      alertas,
      financeiro: {
        totalIncome,
        totalExpenses,
        saldoMes,
        pctOrcamento,
        netWorth: Number(assetsResult?.total ?? 0) - Number(debtsResult?.total ?? 0),
        estouradosCount: estourados.length,
        mes: mesAtual,
        ano: anoAtual,
      },
      performance: {
        treinoHoje,
        diasComRegistro: progressos7dias.length,
        ultimoProgresso: progressos7dias[0] ?? null,
        objetivoFisico: objetivoFisico[0] ?? null,
        treinosAtivos: treinos.length,
      },
      direcao: {
        metasAtivas: metasComStatus,
        totalMetas: metasAtivas.length,
        checkpointsAtrasados: checkpointsAtrasados.length,
        metasEmRisco: metasComStatus.filter(m => m.atrasado || m.emRisco).length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar dashboard global" });
  }
});

export default router;
