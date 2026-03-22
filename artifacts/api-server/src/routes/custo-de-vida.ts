import { Router } from "express";
import { db } from "@workspace/db";
import { recurringTransactionsTable, assetsTable, transactionsTable, categoriesTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

router.get("/custo-de-vida", async (_req, res) => {
  // Active recurring expenses with category
  const recurring = await db
    .select({
      id: recurringTransactionsTable.id,
      descricao: recurringTransactionsTable.descricao,
      valor: recurringTransactionsTable.valor,
      tipoCusto: recurringTransactionsTable.tipoCusto,
      obrigatorio: recurringTransactionsTable.obrigatorio,
      formaPagamento: recurringTransactionsTable.formaPagamento,
      frequencia: recurringTransactionsTable.frequencia,
      tipo: recurringTransactionsTable.tipo,
      categoriaId: recurringTransactionsTable.categoriaId,
      categoriaName: categoriesTable.name,
    })
    .from(recurringTransactionsTable)
    .leftJoin(categoriesTable, eq(recurringTransactionsTable.categoriaId, categoriesTable.id))
    .where(eq(recurringTransactionsTable.ativo, true));

  const expenses = recurring.filter(r => r.tipo === "despesa");
  const incomes = recurring.filter(r => r.tipo === "receita");

  // Group expenses by tipoCusto
  const types = ["essencial", "fixo", "variavel", "investimento", "luxo"] as const;
  const byType: Record<string, { items: typeof expenses; total: number }> = {};
  for (const t of types) {
    const items = expenses.filter(e => (e.tipoCusto ?? "fixo") === t);
    byType[t] = { items, total: items.reduce((s, e) => s + Number(e.valor), 0) };
  }

  const totalEssencial = byType["essencial"].total;
  const totalFixo = byType["essencial"].total + byType["fixo"].total;
  const totalInvestimentos = byType["investimento"].total;
  const totalRecorrente = expenses.reduce((s, e) => s + Number(e.valor), 0);
  const totalReceitas = incomes.reduce((s, e) => s + Number(e.valor), 0);

  // Last 3 months average actual expenses
  const today = new Date();
  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  const [avgResult] = await db
    .select({ avg: sql<number>`COALESCE(AVG(monthly_total), 0)` })
    .from(
      db
        .select({
          monthly_total: sql<number>`SUM(${transactionsTable.amount})`.as("monthly_total"),
        })
        .from(transactionsTable)
        .where(and(
          eq(transactionsTable.type, "expense"),
          sql`${transactionsTable.competenceDate} >= ${threeMonthsAgo.toISOString().split("T")[0]}`
        ))
        .groupBy(
          sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}),
              EXTRACT(MONTH FROM ${transactionsTable.competenceDate})`
        )
        .as("monthly_expenses")
    );

  const custoReal = Number(avgResult?.avg ?? 0);

  // Total assets
  const [assetSum] = await db
    .select({ total: sql<number>`COALESCE(SUM(${assetsTable.amount}), 0)` })
    .from(assetsTable)
    .where(eq(assetsTable.status, "active"));

  const patrimonio = Number(assetSum?.total ?? 0);

  res.json({
    custoEssencial: totalEssencial,
    custoFixo: totalFixo,
    custoRecorrente: totalRecorrente,
    custoReal,
    totalReceitas,
    totalInvestimentos,
    patrimonio,
    reserva6meses: totalEssencial * 6,
    reserva12meses: totalEssencial * 12,
    mesesAutonomiaEssencial: totalEssencial > 0 ? Math.floor(patrimonio / totalEssencial) : null,
    mesesAutonomiaFixo: totalFixo > 0 ? Math.floor(patrimonio / totalFixo) : null,
    byType: Object.fromEntries(
      types.map(t => [
        t,
        {
          total: byType[t].total,
          items: byType[t].items.map(i => ({ ...i, valor: Number(i.valor) })),
        },
      ])
    ),
    receitas: incomes.map(i => ({ ...i, valor: Number(i.valor) })),
  });
});

export default router;
