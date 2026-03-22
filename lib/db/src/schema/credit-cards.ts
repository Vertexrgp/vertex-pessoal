import { pgTable, serial, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const creditCardsTable = pgTable("credit_cards", {
  id: serial("id").primaryKey(),
  nomeCartao: text("nome_cartao").notNull(),
  banco: text("banco").notNull(),
  bandeira: text("bandeira").notNull(),
  limiteTotal: numeric("limite_total", { precision: 15, scale: 2 }).notNull().default("0"),
  diaFechamento: integer("dia_fechamento").notNull(),
  diaVencimento: integer("dia_vencimento").notNull(),
  cor: text("cor").notNull().default("#6366F1"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCreditCardSchema = createInsertSchema(creditCardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCreditCard = z.infer<typeof insertCreditCardSchema>;
export type CreditCard = typeof creditCardsTable.$inferSelect;
