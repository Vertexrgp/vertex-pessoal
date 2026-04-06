import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { accountsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

const toNum = (v: any) => (v !== null && v !== undefined ? Number(v) : 0);

router.get("/accounts", async (_req: Request, res: Response) => {
  try {
    const accounts = await db.select().from(accountsTable).where(eq(accountsTable.isActive, true)).orderBy(asc(accountsTable.name));
    res.json(accounts.map(a => ({ ...a, balance: toNum(a.balance) })));
  } catch { res.status(500).json({ error: "Erro ao buscar contas" }); }
});

router.post("/accounts", async (req: Request, res: Response) => {
  try {
    const { name, type, balance, banco, color } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 1) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }
    const validTypes = ["checking", "savings", "wallet", "investment", "credit"];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: "Tipo inválido" });
    }
    const [account] = await db.insert(accountsTable).values({
      name: name.trim(),
      type: type ?? "checking",
      balance: String(toNum(balance)),
      banco: banco ? String(banco).trim() : null,
      color: color ?? "#6366f1",
      isActive: true,
    }).returning();
    res.status(201).json({ ...account, balance: toNum(account.balance) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/accounts/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
    if (!account) return res.status(404).json({ error: "Conta não encontrada" });
    res.json({ ...account, balance: toNum(account.balance) });
  } catch { res.status(500).json({ error: "Erro ao buscar conta" }); }
});

router.put("/accounts/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const { name, type, balance, banco, color, isActive } = req.body;
    const update: any = {};
    if (name !== undefined) update.name = String(name).trim();
    if (type !== undefined) update.type = String(type);
    if (balance !== undefined) update.balance = String(toNum(balance));
    if (banco !== undefined) update.banco = banco ? String(banco).trim() : null;
    if (color !== undefined) update.color = String(color);
    if (isActive !== undefined) update.isActive = Boolean(isActive);
    const [account] = await db.update(accountsTable).set(update).where(eq(accountsTable.id, id)).returning();
    if (!account) return res.status(404).json({ error: "Conta não encontrada" });
    res.json({ ...account, balance: toNum(account.balance) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/accounts/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(accountsTable).where(eq(accountsTable.id, id));
    res.status(204).send();
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
