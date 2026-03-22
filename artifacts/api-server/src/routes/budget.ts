import { Router } from "express";
import { db } from "@workspace/db";
import { budgetGroupsTable, budgetItemsTable, categoriesTable, insertBudgetGroupSchema, insertBudgetItemSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/budget-groups", async (_req, res) => {
  const rows = await db.select().from(budgetGroupsTable).orderBy(budgetGroupsTable.sortOrder);
  res.json(rows.map(r => ({ ...r, targetPercentage: r.targetPercentage !== null ? Number(r.targetPercentage) : null })));
});

router.post("/budget-groups", async (req, res) => {
  const data = insertBudgetGroupSchema.parse(req.body);
  const [row] = await db.insert(budgetGroupsTable).values(data).returning();
  res.status(201).json({ ...row, targetPercentage: row.targetPercentage !== null ? Number(row.targetPercentage) : null });
});

router.put("/budget-groups/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const data = insertBudgetGroupSchema.parse(req.body);
  const [row] = await db.update(budgetGroupsTable).set(data).where(eq(budgetGroupsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ ...row, targetPercentage: row.targetPercentage !== null ? Number(row.targetPercentage) : null });
});

router.get("/budget-items", async (req, res) => {
  const { groupId, month, year } = req.query;
  const conditions = [];
  if (groupId) conditions.push(eq(budgetItemsTable.groupId, Number(groupId)));
  if (month) conditions.push(eq(budgetItemsTable.month, Number(month)));
  if (year) conditions.push(eq(budgetItemsTable.year, Number(year)));

  const rows = await db
    .select({
      id: budgetItemsTable.id,
      groupId: budgetItemsTable.groupId,
      groupName: budgetGroupsTable.name,
      categoryId: budgetItemsTable.categoryId,
      categoryName: categoriesTable.name,
      description: budgetItemsTable.description,
      month: budgetItemsTable.month,
      year: budgetItemsTable.year,
      plannedAmount: budgetItemsTable.plannedAmount,
      realizedAmount: budgetItemsTable.realizedAmount,
    })
    .from(budgetItemsTable)
    .leftJoin(budgetGroupsTable, eq(budgetItemsTable.groupId, budgetGroupsTable.id))
    .leftJoin(categoriesTable, eq(budgetItemsTable.categoryId, categoriesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(budgetItemsTable.groupId, budgetItemsTable.description);

  res.json(rows.map(r => {
    const planned = Number(r.plannedAmount);
    const realized = Number(r.realizedAmount);
    const difference = planned - realized;
    const status = Math.abs(difference) < 0.01 ? "on_track" : realized > planned ? "over" : "under";
    return {
      ...r,
      groupName: r.groupName ?? "",
      categoryName: r.categoryName ?? null,
      plannedAmount: planned,
      realizedAmount: realized,
      difference,
      status,
    };
  }));
});

router.post("/budget-items", async (req, res) => {
  const data = insertBudgetItemSchema.parse(req.body);
  const [row] = await db.insert(budgetItemsTable).values(data).returning();
  const planned = Number(row.plannedAmount);
  const realized = Number(row.realizedAmount);
  const difference = planned - realized;
  res.status(201).json({
    ...row,
    groupName: "",
    categoryName: null,
    plannedAmount: planned,
    realizedAmount: realized,
    difference,
    status: "on_track",
  });
});

router.put("/budget-items/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const data = insertBudgetItemSchema.parse(req.body);
  const [row] = await db.update(budgetItemsTable).set(data).where(eq(budgetItemsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const planned = Number(row.plannedAmount);
  const realized = Number(row.realizedAmount);
  const difference = planned - realized;
  res.json({
    ...row,
    groupName: "",
    categoryName: null,
    plannedAmount: planned,
    realizedAmount: realized,
    difference,
    status: realized > planned ? "over" : realized < planned ? "under" : "on_track",
  });
});

export default router;
