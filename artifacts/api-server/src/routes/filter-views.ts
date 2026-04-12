import { Router } from "express";
import { db } from "@workspace/db";
import { filterViewsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/filter-views
router.get("/", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const views = await db
      .select()
      .from(filterViewsTable)
      .where(eq(filterViewsTable.userId, userId))
      .orderBy(filterViewsTable.createdAt);
    res.json(views);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao buscar visualizações" });
  }
});

// POST /api/filter-views
router.post("/", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { name, filters } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }
    if (!filters || typeof filters !== "object") {
      return res.status(400).json({ error: "Filtros inválidos" });
    }
    const [created] = await db
      .insert(filterViewsTable)
      .values({ userId, name: name.trim(), filters })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao salvar visualização" });
  }
});

// DELETE /api/filter-views/:id
router.delete("/:id", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const id = Number(req.params.id);
    await db
      .delete(filterViewsTable)
      .where(and(eq(filterViewsTable.id, id), eq(filterViewsTable.userId, userId)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao excluir visualização" });
  }
});

export default router;
