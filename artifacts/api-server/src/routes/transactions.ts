import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, categoriesTable, subcategoriesTable, accountsTable, insertTransactionSchema } from "@workspace/db/schema";
import { eq, and, sql, ilike } from "drizzle-orm";

const router = Router();

function formatTx(tx: any, catName?: string | null, subcatName?: string | null, accountName?: string | null) {
  return {
    ...tx,
    amount: Number(tx.amount),
    categoryName: catName ?? null,
    subcategoryName: subcatName ?? null,
    accountName: accountName ?? null,
  };
}

router.get("/transactions", async (req, res) => {
  const { month, year, categoryId, accountId, type, search } = req.query;

  let query = db
    .select({
      id: transactionsTable.id,
      competenceDate: transactionsTable.competenceDate,
      movementDate: transactionsTable.movementDate,
      categoryId: transactionsTable.categoryId,
      categoryName: categoriesTable.name,
      subcategoryId: transactionsTable.subcategoryId,
      subcategoryName: subcategoriesTable.name,
      type: transactionsTable.type,
      paymentMethod: transactionsTable.paymentMethod,
      description: transactionsTable.description,
      amount: transactionsTable.amount,
      accountId: transactionsTable.accountId,
      accountName: accountsTable.name,
      status: transactionsTable.status,
      notes: transactionsTable.notes,
      createdAt: transactionsTable.createdAt,
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .leftJoin(subcategoriesTable, eq(transactionsTable.subcategoryId, subcategoriesTable.id))
    .leftJoin(accountsTable, eq(transactionsTable.accountId, accountsTable.id));

  const conditions = [];

  if (month && year) {
    conditions.push(
      sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${Number(month)}`,
      sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${Number(year)}`
    );
  } else if (year) {
    conditions.push(sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${Number(year)}`);
  }

  if (categoryId) {
    conditions.push(eq(transactionsTable.categoryId, Number(categoryId)));
  }

  if (accountId) {
    conditions.push(eq(transactionsTable.accountId, Number(accountId)));
  }

  if (type) {
    conditions.push(eq(transactionsTable.type, String(type)));
  }

  if (search) {
    conditions.push(ilike(transactionsTable.description, `%${search}%`));
  }

  const result = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(transactionsTable.competenceDate)
    : await query.orderBy(transactionsTable.competenceDate);

  res.json(result.map(tx => ({ ...tx, amount: Number(tx.amount) })));
});

router.post("/transactions", async (req, res) => {
  const data = insertTransactionSchema.parse(req.body);
  const [tx] = await db.insert(transactionsTable).values(data).returning();
  res.status(201).json({ ...tx, amount: Number(tx.amount) });
});

router.get("/transactions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!tx) return res.status(404).json({ error: "Not found" });
  res.json({ ...tx, amount: Number(tx.amount) });
});

router.put("/transactions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const data = insertTransactionSchema.parse(req.body);
  const [tx] = await db.update(transactionsTable).set(data).where(eq(transactionsTable.id, id)).returning();
  if (!tx) return res.status(404).json({ error: "Not found" });
  res.json({ ...tx, amount: Number(tx.amount) });
});

router.delete("/transactions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(transactionsTable).where(eq(transactionsTable.id, id));
  res.status(204).send();
});

router.post("/transactions/:id/duplicate", async (req, res) => {
  const id = parseInt(req.params.id);
  const [original] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!original) return res.status(404).json({ error: "Not found" });
  const { id: _id, createdAt: _ca, ...rest } = original;
  const [tx] = await db.insert(transactionsTable).values({ ...rest, description: `${rest.description} (cópia)` }).returning();
  res.status(201).json({ ...tx, amount: Number(tx.amount) });
});

export default router;
