import { Router } from "express";
import { db } from "@workspace/db";
import { assetsTable, receivablesTable, debtsTable, incomesTable, insertAssetSchema, insertReceivableSchema, insertDebtSchema, insertIncomeSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function numericFields(obj: any, fields: string[]) {
  const result = { ...obj };
  for (const f of fields) {
    if (result[f] !== undefined) result[f] = Number(result[f]);
  }
  return result;
}

// Assets (Investments)
router.get("/assets", async (_req, res) => {
  const rows = await db.select().from(assetsTable).orderBy(assetsTable.description);
  res.json(rows.map(r => numericFields(r, ["amount"])));
});
router.post("/assets", async (req, res) => {
  const data = insertAssetSchema.parse(req.body);
  const [row] = await db.insert(assetsTable).values(data).returning();
  res.status(201).json(numericFields(row, ["amount"]));
});
router.put("/assets/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const data = insertAssetSchema.parse(req.body);
  const [row] = await db.update(assetsTable).set(data).where(eq(assetsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(numericFields(row, ["amount"]));
});
router.delete("/assets/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(assetsTable).where(eq(assetsTable.id, id));
  res.status(204).send();
});

// Receivables
router.get("/receivables", async (_req, res) => {
  const rows = await db.select().from(receivablesTable).orderBy(receivablesTable.dueDate);
  res.json(rows.map(r => numericFields(r, ["amount"])));
});
router.post("/receivables", async (req, res) => {
  const data = insertReceivableSchema.parse(req.body);
  const [row] = await db.insert(receivablesTable).values(data).returning();
  res.status(201).json(numericFields(row, ["amount"]));
});
router.put("/receivables/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const data = insertReceivableSchema.parse(req.body);
  const [row] = await db.update(receivablesTable).set(data).where(eq(receivablesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(numericFields(row, ["amount"]));
});
router.delete("/receivables/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(receivablesTable).where(eq(receivablesTable.id, id));
  res.status(204).send();
});

// Debts
router.get("/debts", async (_req, res) => {
  const rows = await db.select().from(debtsTable).orderBy(debtsTable.dueDate);
  res.json(rows.map(r => numericFields(r, ["totalAmount", "remainingAmount", "monthlyInstallment"])));
});
router.post("/debts", async (req, res) => {
  const data = insertDebtSchema.parse(req.body);
  const [row] = await db.insert(debtsTable).values(data).returning();
  res.status(201).json(numericFields(row, ["totalAmount", "remainingAmount", "monthlyInstallment"]));
});
router.put("/debts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const data = insertDebtSchema.parse(req.body);
  const [row] = await db.update(debtsTable).set(data).where(eq(debtsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(numericFields(row, ["totalAmount", "remainingAmount", "monthlyInstallment"]));
});
router.delete("/debts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(debtsTable).where(eq(debtsTable.id, id));
  res.status(204).send();
});

// Incomes
router.get("/incomes", async (_req, res) => {
  const rows = await db.select().from(incomesTable).orderBy(incomesTable.description);
  res.json(rows.map(r => numericFields(r, ["amount"])));
});
router.post("/incomes", async (req, res) => {
  const data = insertIncomeSchema.parse(req.body);
  const [row] = await db.insert(incomesTable).values(data).returning();
  res.status(201).json(numericFields(row, ["amount"]));
});
router.put("/incomes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const data = insertIncomeSchema.parse(req.body);
  const [row] = await db.update(incomesTable).set(data).where(eq(incomesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(numericFields(row, ["amount"]));
});
router.delete("/incomes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(incomesTable).where(eq(incomesTable.id, id));
  res.status(204).send();
});

export default router;
