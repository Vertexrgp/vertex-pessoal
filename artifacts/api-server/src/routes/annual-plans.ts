import { Router } from "express";
import { db } from "@workspace/db";
import { annualPlansTable, transactionsTable, recurringTransactionsTable } from "@workspace/db/schema";
import { eq, and, sql, lte, or, isNull, gte } from "drizzle-orm";

const router = Router();

function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}
function monthEnd(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

// Returns all 12 months for a given year with planned + actual + forecast values
router.get("/annual-plans", async (req, res) => {
  const year = parseInt(String(req.query.year ?? new Date().getFullYear()));

  // Fetch stored annual plans
  const plans = await db.select().from(annualPlansTable).where(eq(annualPlansTable.year, year));

  // Fetch active recurring transactions
  const recurring = await db
    .select()
    .from(recurringTransactionsTable)
    .where(eq(recurringTransactionsTable.ativo, true));

  const months = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const month = i + 1;
      const plan = plans.find(p => p.month === month);

      const mStart = monthStart(year, month);
      const mEnd = monthEnd(year, month);

      // ─── Actual values from real transactions ───────────────────────────────
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

      // ─── Forecast from recurring transactions ────────────────────────────────
      // Active recurring where: dataInicio <= month end AND (dataFim is null OR dataFim >= month start)
      const activeForMonth = recurring.filter(r => {
        const start = r.dataInicio;
        const end = r.dataFim;
        return start <= mEnd && (end === null || end >= mStart);
      });

      const forecastReceitas = activeForMonth
        .filter(r => r.tipo === "receita")
        .reduce((s, r) => s + Number(r.valor), 0);

      const forecastDespesasRecorrentes = activeForMonth
        .filter(r => r.tipo === "despesa")
        .reduce((s, r) => s + Number(r.valor), 0);

      // ─── Forecast from future credit card installments ───────────────────────
      const [installments] = await db
        .select({ total: sql<number>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
        .from(transactionsTable)
        .where(and(
          eq(transactionsTable.type, "expense"),
          eq(transactionsTable.creditType, "parcelado"),
          sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${month}`,
          sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${year}`
        ));

      const forecastParcelas = Number(installments?.total ?? 0);
      const forecastDespesas = forecastDespesasRecorrentes + forecastParcelas;

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
        forecastReceitas,
        forecastDespesas,
        forecastRecorrentes: forecastDespesasRecorrentes,
        forecastParcelas,
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
