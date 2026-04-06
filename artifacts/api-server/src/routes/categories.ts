import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { categoriesTable, subcategoriesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

const DEFAULT_CATEGORIES = [
  { name: "Alimentação", type: "expense", color: "#f97316", icon: "utensils", group: "variable" },
  { name: "Moradia", type: "expense", color: "#6366f1", icon: "home", group: "fixed" },
  { name: "Transporte", type: "expense", color: "#0ea5e9", icon: "car", group: "variable" },
  { name: "Saúde", type: "expense", color: "#10b981", icon: "heart", group: "variable" },
  { name: "Lazer", type: "expense", color: "#ec4899", icon: "smile", group: "variable" },
  { name: "Educação", type: "expense", color: "#8b5cf6", icon: "book", group: "fixed" },
  { name: "Vestuário", type: "expense", color: "#f59e0b", icon: "shopping-bag", group: "variable" },
  { name: "Investimentos", type: "expense", color: "#14b8a6", icon: "trending-up", group: "investment" },
  { name: "Salário", type: "income", color: "#22c55e", icon: "briefcase", group: "income" },
  { name: "Freelance", type: "income", color: "#84cc16", icon: "laptop", group: "income" },
  { name: "Rendimentos", type: "income", color: "#06b6d4", icon: "percent", group: "income" },
];

router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const cats = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.name));
    res.json(cats);
  } catch { res.status(500).json({ error: "Erro ao buscar categorias" }); }
});

router.post("/categories/seed", async (_req: Request, res: Response) => {
  try {
    const existing = await db.select({ id: categoriesTable.id }).from(categoriesTable).limit(1);
    if (existing.length > 0) { res.json({ message: "Já existem categorias", count: existing.length }); return; }
    const rows = await db.insert(categoriesTable).values(DEFAULT_CATEGORIES).returning();
    res.json({ message: `${rows.length} categorias padrão criadas`, count: rows.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/categories", async (req: Request, res: Response) => {
  try {
    const { name, type, color, icon, group } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 1) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }
    if (!type || !["expense", "income"].includes(type)) {
      return res.status(400).json({ error: "Tipo deve ser 'expense' ou 'income'" });
    }
    const [cat] = await db.insert(categoriesTable).values({
      name: name.trim(),
      type,
      color: color ?? "#6366f1",
      icon: icon ?? null,
      group: group ?? null,
      isActive: true,
    }).returning();
    res.status(201).json(cat);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put("/categories/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const { name, type, color, icon, group, isActive } = req.body;
    const update: any = {};
    if (name !== undefined) update.name = String(name).trim();
    if (type !== undefined) update.type = String(type);
    if (color !== undefined) update.color = String(color);
    if (icon !== undefined) update.icon = icon ? String(icon) : null;
    if (group !== undefined) update.group = group ? String(group) : null;
    if (isActive !== undefined) update.isActive = Boolean(isActive);
    const [cat] = await db.update(categoriesTable).set(update).where(eq(categoriesTable.id, id)).returning();
    if (!cat) return res.status(404).json({ error: "Categoria não encontrada" });
    res.json(cat);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/categories/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    res.status(204).send();
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/subcategories", async (_req: Request, res: Response) => {
  try {
    const subs = await db.select().from(subcategoriesTable).orderBy(asc(subcategoriesTable.name));
    res.json(subs);
  } catch { res.status(500).json({ error: "Erro ao buscar subcategorias" }); }
});

router.post("/subcategories", async (req: Request, res: Response) => {
  try {
    const { categoryId, name } = req.body;
    if (!name || !categoryId) return res.status(400).json({ error: "categoryId e name são obrigatórios" });
    const [sub] = await db.insert(subcategoriesTable).values({ categoryId: Number(categoryId), name: String(name), isActive: true }).returning();
    res.status(201).json(sub);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
