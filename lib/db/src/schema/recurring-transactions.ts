import { pgTable, serial, text, numeric, integer, date, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { accountsTable } from "./accounts";

export const recurringTransactionsTable = pgTable("recurring_transactions", {
  id: serial("id").primaryKey(),
  tipo: text("tipo").notNull(),
  descricao: text("descricao").notNull(),
  categoriaId: integer("categoria_id").references(() => categoriesTable.id),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull().default("0"),
  formaPagamento: text("forma_pagamento"),
  contaId: integer("conta_id").references(() => accountsTable.id),
  diaVencimento: integer("dia_vencimento").notNull().default(1),
  frequencia: text("frequencia").notNull().default("mensal"),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
  ativo: boolean("ativo").notNull().default(true),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRecurringTransactionSchema = createInsertSchema(recurringTransactionsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertRecurringTransaction = z.infer<typeof insertRecurringTransactionSchema>;
export type RecurringTransaction = typeof recurringTransactionsTable.$inferSelect;
