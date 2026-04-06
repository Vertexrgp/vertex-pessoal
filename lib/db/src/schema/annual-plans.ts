import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const annualPlansTable = pgTable("annual_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  plannedReceitas: numeric("planned_receitas", { precision: 15, scale: 2 }).notNull().default("0"),
  plannedDespesas: numeric("planned_despesas", { precision: 15, scale: 2 }).notNull().default("0"),
  plannedInvestimentos: numeric("planned_investimentos", { precision: 15, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAnnualPlanSchema = createInsertSchema(annualPlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAnnualPlan = z.infer<typeof insertAnnualPlanSchema>;
export type AnnualPlan = typeof annualPlansTable.$inferSelect;
