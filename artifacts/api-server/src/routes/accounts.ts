import { Router } from "express";
import { db } from "@workspace/db";
import { accountsTable, insertAccountSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/accounts", async (req, res) => {
  const accounts = await db.select().from(accountsTable).orderBy(accountsTable.name);
  res.json(accounts.map(a => ({
    ...a,
    balance: Number(a.balance),
  })));
});

router.post("/accounts", async (req, res) => {
  const data = insertAccountSchema.parse(req.body);
  const [account] = await db.insert(accountsTable).values(data).returning();
  res.status(201).json({ ...account, balance: Number(account.balance) });
});

router.get("/accounts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!account) return res.status(404).json({ error: "Not found" });
  res.json({ ...account, balance: Number(account.balance) });
});

router.put("/accounts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const data = insertAccountSchema.parse(req.body);
  const [account] = await db.update(accountsTable).set(data).where(eq(accountsTable.id, id)).returning();
  if (!account) return res.status(404).json({ error: "Not found" });
  res.json({ ...account, balance: Number(account.balance) });
});

router.delete("/accounts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(accountsTable).where(eq(accountsTable.id, id));
  res.status(204).send();
});

export default router;
