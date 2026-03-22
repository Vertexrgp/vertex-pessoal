import { pgTable, serial, text, numeric, integer, date, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable, subcategoriesTable } from "./categories";
import { accountsTable } from "./accounts";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  competenceDate: date("competence_date").notNull(),
  movementDate: date("movement_date").notNull(),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  subcategoryId: integer("subcategory_id").references(() => subcategoriesTable.id),
  type: text("type").notNull(),
  paymentMethod: text("payment_method"),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  accountId: integer("account_id").references(() => accountsTable.id),
  status: text("status").notNull().default("planned"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
