import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const budgetGroupsTable = pgTable("budget_groups", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  name: text("name").notNull(),
  type: text("type").notNull(),
  targetPercentage: numeric("target_percentage", { precision: 5, scale: 2 }),
  color: text("color"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const budgetItemsTable = pgTable("budget_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  groupId: integer("group_id").notNull().references(() => budgetGroupsTable.id),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  description: text("description").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  plannedAmount: numeric("planned_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  realizedAmount: numeric("realized_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBudgetGroupSchema = createInsertSchema(budgetGroupsTable).omit({ id: true, createdAt: true });
export type InsertBudgetGroup = z.infer<typeof insertBudgetGroupSchema>;
export type BudgetGroup = typeof budgetGroupsTable.$inferSelect;

export const insertBudgetItemSchema = createInsertSchema(budgetItemsTable).omit({ id: true, createdAt: true });
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;
export type BudgetItem = typeof budgetItemsTable.$inferSelect;
