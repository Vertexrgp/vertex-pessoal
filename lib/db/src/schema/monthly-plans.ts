import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const monthlyPlansTable = pgTable("monthly_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  plannedIncome: numeric("planned_income", { precision: 15, scale: 2 }).notNull().default("0"),
  plannedExpense: numeric("planned_expense", { precision: 15, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMonthlyPlanSchema = createInsertSchema(monthlyPlansTable).omit({ id: true, createdAt: true });
export type InsertMonthlyPlan = z.infer<typeof insertMonthlyPlanSchema>;
export type MonthlyPlan = typeof monthlyPlansTable.$inferSelect;
