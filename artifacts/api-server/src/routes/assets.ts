import { Router } from "express";
import { db } from "@workspace/db";
import {
  assetsTable,
  receivablesTable,
  debtsTable,
  incomesTable,
  assetHistoryTable,
  debtPaymentsTable,
} from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";

const router = Router();

function num(v: any) { return v !== undefined && v !== null && v !== "" ? Number(v) : null; }
function numStr(v: any) { return v !== undefined && v !== null && v !== "" ? String(Number(v)) : null; }

// ── ASSETS ────────────────────────────────────────────────────────────────────

router.get("/assets", async (_req, res) => {
  const rows = await db.select().from(assetsTable).orderBy(asc(assetsTable.description));
  res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
});

router.get("/assets/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, id));
  if (!asset) return res.status(404).json({ error: "Not found" });
  const history = await db.select().from(assetHistoryTable)
    .where(eq(assetHistoryTable.assetId, id))
    .orderBy(desc(assetHistoryTable.date));
  res.json({ ...asset, amount: Number(asset.amount), history: history.map(h => ({ ...h, amount: Number(h.amount) })) });
});

router.post("/assets", async (req, res) => {
  const { description, category, amount, date, status, notes } = req.body;
  if (!description || !category || !amount || !date) {
    return res.status(400).json({ error: "description, category, amount, date são obrigatórios" });
  }
  const [row] = await db.insert(assetsTable).values({
    description,
    category,
    amount: String(Number(amount)),
    date,
    status: status || "active",
    notes: notes || null,
  }).returning();
  // Auto-create first history entry
  await db.insert(assetHistoryTable).values({
    assetId: row.id,
    amount: String(Number(amount)),
    date,
    note: "Valor inicial",
  });
  res.status(201).json({ ...row, amount: Number(row.amount) });
});

router.put("/assets/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { description, category, amount, date, status, notes } = req.body;
  const [row] = await db.update(assetsTable).set({
    ...(description !== undefined ? { description } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(amount !== undefined ? { amount: String(Number(amount)) } : {}),
    ...(date !== undefined ? { date } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(notes !== undefined ? { notes } : {}),
  }).where(eq(assetsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ ...row, amount: Number(row.amount) });
});

router.delete("/assets/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(assetHistoryTable).where(eq(assetHistoryTable.assetId, id));
  await db.delete(assetsTable).where(eq(assetsTable.id, id));
  res.status(204).send();
});

// ── ASSET HISTORY ─────────────────────────────────────────────────────────────

router.get("/assets/:id/history", async (req, res) => {
  const assetId = parseInt(req.params.id);
  const rows = await db.select().from(assetHistoryTable)
    .where(eq(assetHistoryTable.assetId, assetId))
    .orderBy(desc(assetHistoryTable.date));
  res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
});

router.post("/assets/:id/history", async (req, res) => {
  const assetId = parseInt(req.params.id);
  const { amount, date, note } = req.body;
  if (!amount || !date) return res.status(400).json({ error: "amount e date são obrigatórios" });

  const [row] = await db.insert(assetHistoryTable).values({
    assetId,
    amount: String(Number(amount)),
    date,
    note: note || null,
  }).returning();

  // Update the asset's current amount
  await db.update(assetsTable).set({ amount: String(Number(amount)) }).where(eq(assetsTable.id, assetId));

  res.status(201).json({ ...row, amount: Number(row.amount) });
});

router.delete("/asset-history/:id", async (req, res) => {
  await db.delete(assetHistoryTable).where(eq(assetHistoryTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

// ── RECEIVABLES ───────────────────────────────────────────────────────────────

router.get("/receivables", async (_req, res) => {
  const rows = await db.select().from(receivablesTable).orderBy(asc(receivablesTable.dueDate));
  res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
});

router.post("/receivables", async (req, res) => {
  const { description, category, amount, dueDate, status, notes } = req.body;
  if (!description || !category || !amount || !dueDate) {
    return res.status(400).json({ error: "description, category, amount, dueDate são obrigatórios" });
  }
  const [row] = await db.insert(receivablesTable).values({
    description, category,
    amount: String(Number(amount)),
    dueDate,
    status: status || "pending",
    notes: notes || null,
  }).returning();
  res.status(201).json({ ...row, amount: Number(row.amount) });
});

router.put("/receivables/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { description, category, amount, dueDate, status, notes } = req.body;
  const [row] = await db.update(receivablesTable).set({
    ...(description !== undefined ? { description } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(amount !== undefined ? { amount: String(Number(amount)) } : {}),
    ...(dueDate !== undefined ? { dueDate } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(notes !== undefined ? { notes } : {}),
  }).where(eq(receivablesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ ...row, amount: Number(row.amount) });
});

router.delete("/receivables/:id", async (req, res) => {
  await db.delete(receivablesTable).where(eq(receivablesTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

// ── DEBTS ─────────────────────────────────────────────────────────────────────

router.get("/debts", async (_req, res) => {
  const rows = await db.select().from(debtsTable).orderBy(asc(debtsTable.dueDate));
  res.json(rows.map(r => ({
    ...r,
    totalAmount: Number(r.totalAmount),
    remainingAmount: Number(r.remainingAmount),
    monthlyInstallment: r.monthlyInstallment ? Number(r.monthlyInstallment) : null,
  })));
});

router.get("/debts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [debt] = await db.select().from(debtsTable).where(eq(debtsTable.id, id));
  if (!debt) return res.status(404).json({ error: "Not found" });
  const payments = await db.select().from(debtPaymentsTable)
    .where(eq(debtPaymentsTable.debtId, id))
    .orderBy(desc(debtPaymentsTable.date));
  res.json({
    ...debt,
    totalAmount: Number(debt.totalAmount),
    remainingAmount: Number(debt.remainingAmount),
    monthlyInstallment: debt.monthlyInstallment ? Number(debt.monthlyInstallment) : null,
    payments: payments.map(p => ({ ...p, amount: Number(p.amount) })),
  });
});

router.post("/debts", async (req, res) => {
  const { description, creditor, totalAmount, remainingAmount, dueDate, status, monthlyInstallment, notes } = req.body;
  if (!description || !creditor || !totalAmount || !dueDate) {
    return res.status(400).json({ error: "description, creditor, totalAmount, dueDate são obrigatórios" });
  }
  const remaining = remainingAmount !== undefined ? remainingAmount : totalAmount;
  const [row] = await db.insert(debtsTable).values({
    description, creditor,
    totalAmount: String(Number(totalAmount)),
    remainingAmount: String(Number(remaining)),
    dueDate,
    status: status || "active",
    monthlyInstallment: monthlyInstallment ? String(Number(monthlyInstallment)) : null,
    notes: notes || null,
  }).returning();
  res.status(201).json({
    ...row,
    totalAmount: Number(row.totalAmount),
    remainingAmount: Number(row.remainingAmount),
    monthlyInstallment: row.monthlyInstallment ? Number(row.monthlyInstallment) : null,
  });
});

router.put("/debts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { description, creditor, totalAmount, remainingAmount, dueDate, status, monthlyInstallment, notes } = req.body;
  const [row] = await db.update(debtsTable).set({
    ...(description !== undefined ? { description } : {}),
    ...(creditor !== undefined ? { creditor } : {}),
    ...(totalAmount !== undefined ? { totalAmount: String(Number(totalAmount)) } : {}),
    ...(remainingAmount !== undefined ? { remainingAmount: String(Number(remainingAmount)) } : {}),
    ...(dueDate !== undefined ? { dueDate } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(monthlyInstallment !== undefined ? { monthlyInstallment: monthlyInstallment ? String(Number(monthlyInstallment)) : null } : {}),
    ...(notes !== undefined ? { notes } : {}),
  }).where(eq(debtsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({
    ...row,
    totalAmount: Number(row.totalAmount),
    remainingAmount: Number(row.remainingAmount),
    monthlyInstallment: row.monthlyInstallment ? Number(row.monthlyInstallment) : null,
  });
});

router.delete("/debts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(debtPaymentsTable).where(eq(debtPaymentsTable.debtId, id));
  await db.delete(debtsTable).where(eq(debtsTable.id, id));
  res.status(204).send();
});

// ── DEBT PAYMENTS ─────────────────────────────────────────────────────────────

router.get("/debts/:id/payments", async (req, res) => {
  const debtId = parseInt(req.params.id);
  const rows = await db.select().from(debtPaymentsTable)
    .where(eq(debtPaymentsTable.debtId, debtId))
    .orderBy(desc(debtPaymentsTable.date));
  res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
});

router.post("/debts/:id/payments", async (req, res) => {
  const debtId = parseInt(req.params.id);
  const { amount, date, note } = req.body;
  if (!amount || !date) return res.status(400).json({ error: "amount e date são obrigatórios" });

  const [debt] = await db.select().from(debtsTable).where(eq(debtsTable.id, debtId));
  if (!debt) return res.status(404).json({ error: "Dívida não encontrada" });

  const paymentAmt = Number(amount);
  const newRemaining = Math.max(0, Number(debt.remainingAmount) - paymentAmt);

  const [payment] = await db.insert(debtPaymentsTable).values({
    debtId,
    amount: String(paymentAmt),
    date,
    note: note || null,
  }).returning();

  // Update remaining amount (and mark as paid if zero)
  const newStatus = newRemaining === 0 ? "paid" : debt.status;
  await db.update(debtsTable).set({
    remainingAmount: String(newRemaining),
    status: newStatus,
  }).where(eq(debtsTable.id, debtId));

  res.status(201).json({ ...payment, amount: Number(payment.amount), newRemaining, newStatus });
});

router.delete("/debt-payments/:id", async (req, res) => {
  const [payment] = await db.select().from(debtPaymentsTable).where(eq(debtPaymentsTable.id, parseInt(req.params.id)));
  if (payment) {
    // Restore remaining amount
    const [debt] = await db.select().from(debtsTable).where(eq(debtsTable.id, payment.debtId));
    if (debt) {
      const restored = Number(debt.remainingAmount) + Number(payment.amount);
      await db.update(debtsTable).set({
        remainingAmount: String(Math.min(restored, Number(debt.totalAmount))),
        status: "active",
      }).where(eq(debtsTable.id, payment.debtId));
    }
  }
  await db.delete(debtPaymentsTable).where(eq(debtPaymentsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

// ── INCOMES ───────────────────────────────────────────────────────────────────

router.get("/incomes", async (_req, res) => {
  const rows = await db.select().from(incomesTable).orderBy(asc(incomesTable.description));
  res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
});

router.post("/incomes", async (req, res) => {
  const { description, source, amount, recurrence, isActive, notes } = req.body;
  if (!description || !source || !amount) {
    return res.status(400).json({ error: "description, source, amount são obrigatórios" });
  }
  const [row] = await db.insert(incomesTable).values({
    description, source,
    amount: String(Number(amount)),
    recurrence: recurrence || "monthly",
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    notes: notes || null,
  }).returning();
  res.status(201).json({ ...row, amount: Number(row.amount) });
});

router.put("/incomes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { description, source, amount, recurrence, isActive, notes } = req.body;
  const [row] = await db.update(incomesTable).set({
    ...(description !== undefined ? { description } : {}),
    ...(source !== undefined ? { source } : {}),
    ...(amount !== undefined ? { amount: String(Number(amount)) } : {}),
    ...(recurrence !== undefined ? { recurrence } : {}),
    ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    ...(notes !== undefined ? { notes } : {}),
  }).where(eq(incomesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ ...row, amount: Number(row.amount) });
});

router.delete("/incomes/:id", async (req, res) => {
  await db.delete(incomesTable).where(eq(incomesTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

export default router;
