import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, categoriesTable, budgetItemsTable, budgetGroupsTable } from "@workspace/db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";

const router = Router();

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

router.get("/reports/expenses-by-category", async (req, res) => {
  const now = new Date();
  const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
  const year = req.query.year ? Number(req.query.year) : now.getFullYear();

  const rows = await db
    .select({
      categoryId: transactionsTable.categoryId,
      categoryName: categoriesTable.name,
      group: categoriesTable.group,
      totalAmount: sql<number>`SUM(${transactionsTable.amount})`,
      transactionCount: sql<number>`COUNT(*)`,
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .where(and(
      eq(transactionsTable.type, "expense"),
      sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${month}`,
      sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${year}`
    ))
    .groupBy(transactionsTable.categoryId, categoriesTable.name, categoriesTable.group)
    .orderBy(desc(sql`SUM(${transactionsTable.amount})`));

  const total = rows.reduce((sum, r) => sum + Number(r.totalAmount), 0);

  res.json(rows.map(r => ({
    categoryId: r.categoryId ?? 0,
    categoryName: r.categoryName ?? "Sem categoria",
    group: r.group ?? null,
    totalAmount: Number(r.totalAmount),
    transactionCount: Number(r.transactionCount),
    percentage: total > 0 ? Math.round((Number(r.totalAmount) / total) * 1000) / 10 : 0,
  })));
});

router.get("/reports/monthly-evolution", async (req, res) => {
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  let cumulative = 0;
  const results = [];

  for (let m = 1; m <= 12; m++) {
    const [inc] = await db
      .select({ total: sql<number>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.type, "income"),
        sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${m}`,
        sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${year}`
      ));
    const [exp] = await db
      .select({ total: sql<number>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.type, "expense"),
        sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${m}`,
        sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${year}`
      ));

    const income = Number(inc?.total ?? 0);
    const expenses = Number(exp?.total ?? 0);
    const result = income - expenses;
    cumulative += result;

    results.push({ month: m, monthName: MONTH_NAMES[m - 1], income, expenses, result, cumulativeResult: cumulative });
  }

  res.json(results);
});

router.get("/reports/top-expenses", async (req, res) => {
  const now = new Date();
  const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
  const year = req.query.year ? Number(req.query.year) : now.getFullYear();
  const limit = req.query.limit ? Number(req.query.limit) : 10;

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(and(
      eq(transactionsTable.type, "expense"),
      sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${month}`,
      sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${year}`
    ))
    .orderBy(desc(transactionsTable.amount))
    .limit(limit);

  res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
});

router.get("/reports/planned-vs-realized", async (req, res) => {
  const now = new Date();
  const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
  const year = req.query.year ? Number(req.query.year) : now.getFullYear();

  const groups = await db.select().from(budgetGroupsTable).orderBy(budgetGroupsTable.sortOrder);
  const items = await db
    .select()
    .from(budgetItemsTable)
    .where(and(
      eq(budgetItemsTable.month, month),
      eq(budgetItemsTable.year, year)
    ));

  const result = groups.map(g => {
    const groupItems = items.filter(i => i.groupId === g.id);
    const planned = groupItems.reduce((s, i) => s + Number(i.plannedAmount), 0);
    const realized = groupItems.reduce((s, i) => s + Number(i.realizedAmount), 0);
    const difference = planned - realized;
    const percentageUsed = planned > 0 ? Math.round((realized / planned) * 1000) / 10 : 0;
    const status = realized > planned ? "over" : realized < planned * 0.9 ? "under" : "on_track";

    return {
      groupId: g.id,
      groupName: g.name,
      plannedAmount: planned,
      realizedAmount: realized,
      difference,
      percentageUsed,
      status,
    };
  });

  res.json(result);
});

export default router;
