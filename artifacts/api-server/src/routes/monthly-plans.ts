import { Router } from "express";
import { db } from "@workspace/db";
import { monthlyPlansTable, categoriesTable, transactionsTable, insertMonthlyPlanSchema } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

router.get("/monthly-plans", async (req, res) => {
  const { year } = req.query;

  const plans = await db
    .select({
      id: monthlyPlansTable.id,
      month: monthlyPlansTable.month,
      year: monthlyPlansTable.year,
      categoryId: monthlyPlansTable.categoryId,
      categoryName: categoriesTable.name,
      plannedIncome: monthlyPlansTable.plannedIncome,
      plannedExpense: monthlyPlansTable.plannedExpense,
      notes: monthlyPlansTable.notes,
    })
    .from(monthlyPlansTable)
    .leftJoin(categoriesTable, eq(monthlyPlansTable.categoryId, categoriesTable.id))
    .where(year ? eq(monthlyPlansTable.year, Number(year)) : undefined)
    .orderBy(monthlyPlansTable.month, monthlyPlansTable.year);

  const result = await Promise.all(plans.map(async (plan) => {
    const incomeRows = await db
      .select({ total: sql<number>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.categoryId, plan.categoryId),
        eq(transactionsTable.type, "income"),
        sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${plan.month}`,
        sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${plan.year}`
      ));
    const expenseRows = await db
      .select({ total: sql<number>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.categoryId, plan.categoryId),
        eq(transactionsTable.type, "expense"),
        sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${plan.month}`,
        sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${plan.year}`
      ));

    return {
      ...plan,
      plannedIncome: Number(plan.plannedIncome),
      plannedExpense: Number(plan.plannedExpense),
      actualIncome: Number(incomeRows[0]?.total ?? 0),
      actualExpense: Number(expenseRows[0]?.total ?? 0),
    };
  }));

  res.json(result);
});

router.post("/monthly-plans", async (req, res) => {
  const data = insertMonthlyPlanSchema.parse(req.body);
  const [plan] = await db.insert(monthlyPlansTable).values(data).returning();
  res.status(201).json({
    ...plan,
    plannedIncome: Number(plan.plannedIncome),
    plannedExpense: Number(plan.plannedExpense),
    actualIncome: 0,
    actualExpense: 0,
    categoryName: "",
  });
});

router.put("/monthly-plans/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const data = insertMonthlyPlanSchema.parse(req.body);
  const [plan] = await db.update(monthlyPlansTable).set(data).where(eq(monthlyPlansTable.id, id)).returning();
  if (!plan) return res.status(404).json({ error: "Not found" });
  res.json({
    ...plan,
    plannedIncome: Number(plan.plannedIncome),
    plannedExpense: Number(plan.plannedExpense),
    actualIncome: 0,
    actualExpense: 0,
    categoryName: "",
  });
});

export default router;
