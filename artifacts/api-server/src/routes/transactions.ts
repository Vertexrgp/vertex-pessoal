import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, categoriesTable, subcategoriesTable, accountsTable, insertTransactionSchema } from "@workspace/db/schema";
import { eq, and, sql, ilike } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function formatTx(tx: any) {
  return { ...tx, amount: Number(tx.amount) };
}

const selectFields = {
  id: transactionsTable.id,
  competenceDate: transactionsTable.competenceDate,
  movementDate: transactionsTable.movementDate,
  categoryId: transactionsTable.categoryId,
  categoryName: categoriesTable.name,
  subcategoryId: transactionsTable.subcategoryId,
  subcategoryName: subcategoriesTable.name,
  type: transactionsTable.type,
  paymentMethod: transactionsTable.paymentMethod,
  creditType: transactionsTable.creditType,
  creditCardId: transactionsTable.creditCardId,
  description: transactionsTable.description,
  amount: transactionsTable.amount,
  accountId: transactionsTable.accountId,
  accountName: accountsTable.name,
  status: transactionsTable.status,
  notes: transactionsTable.notes,
  totalInstallments: transactionsTable.totalInstallments,
  currentInstallment: transactionsTable.currentInstallment,
  installmentGroupId: transactionsTable.installmentGroupId,
  createdAt: transactionsTable.createdAt,
};

// ─── GET /transactions ────────────────────────────────────────────────────────
router.get("/transactions", async (req, res) => {
  const { month, year, categoryId, accountId, type, search } = req.query;

  const query = db
    .select(selectFields)
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
  if (categoryId) conditions.push(eq(transactionsTable.categoryId, Number(categoryId)));
  if (accountId) conditions.push(eq(transactionsTable.accountId, Number(accountId)));
  if (type) conditions.push(eq(transactionsTable.type, String(type)));
  if (search) conditions.push(ilike(transactionsTable.description, `%${search}%`));

  const result = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(transactionsTable.competenceDate, transactionsTable.currentInstallment)
    : await query.orderBy(transactionsTable.competenceDate, transactionsTable.currentInstallment);

  res.json(result.map(formatTx));
});

// ─── POST /transactions/installments ─────────────────────────────────────────
router.post("/transactions/installments", async (req, res) => {
  const body = req.body;
  const data = {
    description: String(body.description ?? ""),
    totalAmount: Number(body.totalAmount),
    totalInstallments: Math.round(Number(body.totalInstallments)),
    firstInstallmentDate: String(body.firstInstallmentDate ?? ""),
    firstInstallmentStatus: body.firstInstallmentStatus === "paid" ? "paid" : "planned",
    categoryId: body.categoryId ? Number(body.categoryId) : null,
    subcategoryId: body.subcategoryId ? Number(body.subcategoryId) : null,
    accountId: body.accountId ? Number(body.accountId) : null,
    creditCardId: body.creditCardId ? Number(body.creditCardId) : null,
    paymentMethod: String(body.paymentMethod ?? "Crédito"),
    notes: body.notes ? String(body.notes) : null,
  };
  if (!data.description || !data.totalAmount || data.totalInstallments < 2) {
    return res.status(400).json({ error: "Dados inválidos" });
  }
  const groupId = crypto.randomUUID();
  const n = data.totalInstallments;
  const baseAmount = Math.floor((data.totalAmount / n) * 100) / 100;
  const lastAmount = Math.round((data.totalAmount - baseAmount * (n - 1)) * 100) / 100;

  const firstDate = new Date(data.firstInstallmentDate + "T12:00:00Z");

  const rows = Array.from({ length: n }, (_, i) => {
    const d = new Date(firstDate);
    d.setMonth(d.getMonth() + i);
    const dateStr = d.toISOString().split("T")[0];
    const amount = i === n - 1 ? lastAmount.toFixed(2) : baseAmount.toFixed(2);
    return {
      competenceDate: dateStr,
      movementDate: dateStr,
      categoryId: data.categoryId ?? null,
      subcategoryId: data.subcategoryId ?? null,
      type: "expense" as const,
      paymentMethod: data.paymentMethod,
      creditType: "parcelado",
      creditCardId: data.creditCardId ?? null,
      description: data.description,
      amount,
      accountId: data.accountId ?? null,
      status: i === 0 ? (data.firstInstallmentStatus as string) : "planned",
      notes: data.notes ?? null,
      totalInstallments: n,
      currentInstallment: i + 1,
      installmentGroupId: groupId,
    };
  });

  const inserted = await db.insert(transactionsTable).values(rows).returning();
  res.status(201).json(inserted.map(formatTx));
});

// ─── POST /transactions ───────────────────────────────────────────────────────
router.post("/transactions", async (req, res) => {
  const data = insertTransactionSchema.parse(req.body);
  const [tx] = await db.insert(transactionsTable).values(data).returning();
  res.status(201).json(formatTx(tx));
});

// ─── GET /transactions/:id ────────────────────────────────────────────────────
router.get("/transactions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!tx) return res.status(404).json({ error: "Not found" });
  res.json(formatTx(tx));
});

// ─── PUT /transactions/:id ────────────────────────────────────────────────────
router.put("/transactions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const data = insertTransactionSchema.parse(req.body);
  const [tx] = await db.update(transactionsTable).set(data).where(eq(transactionsTable.id, id)).returning();
  if (!tx) return res.status(404).json({ error: "Not found" });
  res.json(formatTx(tx));
});

// ─── DELETE /transactions/group/:groupId ──────────────────────────────────────
router.delete("/transactions/group/:groupId", async (req, res) => {
  const groupId = req.params.groupId;
  await db.delete(transactionsTable).where(eq(transactionsTable.installmentGroupId, groupId));
  res.status(204).send();
});

// ─── DELETE /transactions/:id ─────────────────────────────────────────────────
router.delete("/transactions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(transactionsTable).where(eq(transactionsTable.id, id));
  res.status(204).send();
});

// ─── POST /transactions/:id/duplicate ────────────────────────────────────────
router.post("/transactions/:id/duplicate", async (req, res) => {
  const id = parseInt(req.params.id);
  const [original] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!original) return res.status(404).json({ error: "Not found" });
  const { id: _id, createdAt: _ca, installmentGroupId: _gid, currentInstallment: _ci, totalInstallments: _ti, ...rest } = original;
  const [tx] = await db.insert(transactionsTable).values({ ...rest, description: `${rest.description} (cópia)`, creditType: null }).returning();
  res.status(201).json(formatTx(tx));
});

export default router;
