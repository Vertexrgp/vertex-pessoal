import { Router } from "express";
import { db } from "@workspace/db";
import { annualPlansTable, transactionsTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

// Returns all 12 months for a given year with planned + actual values
router.get("/annual-plans", async (req, res) => {
  const year = parseInt(String(req.query.year ?? new Date().getFullYear()));

  const plans = await db
    .select()
    .from(annualPlansTable)
    .where(eq(annualPlansTable.year, year));

  const months = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const month = i + 1;
      const plan = plans.find(p => p.month === month);

      const [income] = await db
        .select({ total: sql<number>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
        .from(transactionsTable)
        .where(and(
          eq(transactionsTable.type, "income"),
          sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${month}`,
          sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${year}`
        ));

      const [expense] = await db
        .select({ total: sql<number>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
        .from(transactionsTable)
        .where(and(
          eq(transactionsTable.type, "expense"),
          sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${month}`,
          sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${year}`
        ));

      return {
        month,
        year,
        planId: plan?.id ?? null,
        plannedReceitas: Number(plan?.plannedReceitas ?? 0),
        plannedDespesas: Number(plan?.plannedDespesas ?? 0),
        plannedInvestimentos: Number(plan?.plannedInvestimentos ?? 0),
        notes: plan?.notes ?? null,
        actualReceitas: Number(income?.total ?? 0),
        actualDespesas: Number(expense?.total ?? 0),
      };
    })
  );

  res.json(months);
});

// Upsert plan for a specific month
router.put("/annual-plans/:year/:month", async (req, res) => {
  const year = parseInt(req.params.year);
  const month = parseInt(req.params.month);

  const { plannedReceitas, plannedDespesas, plannedInvestimentos, notes } = req.body;

  const existing = await db
    .select()
    .from(annualPlansTable)
    .where(and(eq(annualPlansTable.year, year), eq(annualPlansTable.month, month)));

  let plan;
  if (existing.length > 0) {
    [plan] = await db
      .update(annualPlansTable)
      .set({
        plannedReceitas: String(Number(plannedReceitas ?? 0).toFixed(2)),
        plannedDespesas: String(Number(plannedDespesas ?? 0).toFixed(2)),
        plannedInvestimentos: String(Number(plannedInvestimentos ?? 0).toFixed(2)),
        notes: notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(annualPlansTable.id, existing[0].id))
      .returning();
  } else {
    [plan] = await db
      .insert(annualPlansTable)
      .values({
        year,
        month,
        plannedReceitas: String(Number(plannedReceitas ?? 0).toFixed(2)),
        plannedDespesas: String(Number(plannedDespesas ?? 0).toFixed(2)),
        plannedInvestimentos: String(Number(plannedInvestimentos ?? 0).toFixed(2)),
        notes: notes ?? null,
      })
      .returning();
  }

  res.json({
    ...plan,
    plannedReceitas: Number(plan.plannedReceitas),
    plannedDespesas: Number(plan.plannedDespesas),
    plannedInvestimentos: Number(plan.plannedInvestimentos),
  });
});

export default router;
