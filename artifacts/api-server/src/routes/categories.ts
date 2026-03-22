import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, subcategoriesTable, insertCategorySchema, insertSubcategorySchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/categories", async (req, res) => {
  const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(cats);
});

router.post("/categories", async (req, res) => {
  const data = insertCategorySchema.parse(req.body);
  const [cat] = await db.insert(categoriesTable).values(data).returning();
  res.status(201).json(cat);
});

router.get("/subcategories", async (req, res) => {
  const subs = await db.select().from(subcategoriesTable).orderBy(subcategoriesTable.name);
  res.json(subs);
});

router.post("/subcategories", async (req, res) => {
  const data = insertSubcategorySchema.parse(req.body);
  const [sub] = await db.insert(subcategoriesTable).values(data).returning();
  res.status(201).json(sub);
});

export default router;
