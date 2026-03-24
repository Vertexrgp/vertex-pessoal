import { pgTable, serial, text, numeric, date, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assetsTable = pgTable("assets", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  date: date("date").notNull(),
  status: text("status").notNull().default("active"),
  recurrence: text("recurrence"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const receivablesTable = pgTable("receivables", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  status: text("status").notNull().default("pending"),
  recurrence: text("recurrence"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const debtsTable = pgTable("debts", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  creditor: text("creditor").notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  remainingAmount: numeric("remaining_amount", { precision: 15, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  status: text("status").notNull().default("active"),
  monthlyInstallment: numeric("monthly_installment", { precision: 15, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const incomesTable = pgTable("incomes", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  source: text("source").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  recurrence: text("recurrence").notNull().default("monthly"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Asset value history ─────────────────────────────────────────────────────
export const assetHistoryTable = pgTable("asset_history", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").references(() => assetsTable.id).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  date: date("date").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Debt payment history ─────────────────────────────────────────────────────
export const debtPaymentsTable = pgTable("debt_payments", {
  id: serial("id").primaryKey(),
  debtId: integer("debt_id").references(() => debtsTable.id).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  date: date("date").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({ id: true, createdAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;
export type AssetHistory = typeof assetHistoryTable.$inferSelect;

export const insertReceivableSchema = createInsertSchema(receivablesTable).omit({ id: true, createdAt: true });
export type InsertReceivable = z.infer<typeof insertReceivableSchema>;
export type Receivable = typeof receivablesTable.$inferSelect;

export const insertDebtSchema = createInsertSchema(debtsTable).omit({ id: true, createdAt: true });
export type InsertDebt = z.infer<typeof insertDebtSchema>;
export type Debt = typeof debtsTable.$inferSelect;
export type DebtPayment = typeof debtPaymentsTable.$inferSelect;

export const insertIncomeSchema = createInsertSchema(incomesTable).omit({ id: true, createdAt: true });
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Income = typeof incomesTable.$inferSelect;
