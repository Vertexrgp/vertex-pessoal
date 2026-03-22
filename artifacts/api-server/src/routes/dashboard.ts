import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, assetsTable, receivablesTable, debtsTable, categoriesTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

router.get("/dashboard/summary", async (req, res) => {
  const now = new Date();
  const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
  const year = req.query.year ? Number(req.query.year) : now.getFullYear();

  const [incomeResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
    .from(transactionsTable)
    .where(and(
      eq(transactionsTable.type, "income"),
      sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${month}`,
      sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${year}`
    ));

  const [expenseResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
    .from(transactionsTable)
    .where(and(
      eq(transactionsTable.type, "expense"),
      sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${month}`,
      sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${year}`
    ));

  const [totalAssetsResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${assetsTable.amount}), 0)` })
    .from(assetsTable)
    .where(eq(assetsTable.status, "active"));

  const [totalReceivablesResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${receivablesTable.amount}), 0)` })
    .from(receivablesTable)
    .where(eq(receivablesTable.status, "pending"));

  const [totalDebtsResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${debtsTable.remainingAmount}), 0)` })
    .from(debtsTable)
    .where(eq(debtsTable.status, "active"));

  const totalIncome = Number(incomeResult?.total ?? 0);
  const totalExpenses = Number(expenseResult?.total ?? 0);
  const monthResult = totalIncome - totalExpenses;
  const savingsPercentage = totalIncome > 0 ? (monthResult / totalIncome) * 100 : 0;
  const totalAssets = Number(totalAssetsResult?.total ?? 0);
  const totalReceivables = Number(totalReceivablesResult?.total ?? 0);
  const totalDebts = Number(totalDebtsResult?.total ?? 0);

  res.json({
    monthBalance: monthResult,
    totalIncome,
    totalExpenses,
    monthResult,
    savingsPercentage: Math.round(savingsPercentage * 10) / 10,
    totalAssets,
    totalDebts,
    totalReceivables,
    netWorth: totalAssets + totalReceivables - totalDebts,
  });
});

router.get("/dashboard/monthly-chart", async (req, res) => {
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
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
    results.push({ month: m, monthName: MONTH_NAMES[m - 1], income, expenses, result: income - expenses });
  }

  res.json(results);
});

router.get("/dashboard/category-chart", async (req, res) => {
  const now = new Date();
  const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
  const year = req.query.year ? Number(req.query.year) : now.getFullYear();

  const rows = await db
    .select({
      categoryId: transactionsTable.categoryId,
      categoryName: categoriesTable.name,
      color: categoriesTable.color,
      amount: sql<number>`SUM(${transactionsTable.amount})`,
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .where(and(
      eq(transactionsTable.type, "expense"),
      sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${month}`,
      sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${year}`
    ))
    .groupBy(transactionsTable.categoryId, categoriesTable.name, categoriesTable.color);

  const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);

  res.json(rows.map(r => ({
    categoryId: r.categoryId ?? 0,
    categoryName: r.categoryName ?? "Sem categoria",
    amount: Number(r.amount),
    percentage: total > 0 ? Math.round((Number(r.amount) / total) * 1000) / 10 : 0,
    color: r.color ?? null,
  })));
});

export default router;
