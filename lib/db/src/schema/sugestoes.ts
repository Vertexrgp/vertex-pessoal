import { pgTable, serial, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const sugestoesTable = pgTable("sugestoes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  modulo: text("modulo").notNull(),
  titulo: text("titulo").notNull(),
  explicacao: text("explicacao").notNull(),
  motivo: text("motivo").notNull(),
  impacto: text("impacto").notNull(),
  confianca: text("confianca").notNull().default("media"),
  status: text("status").notNull().default("pendente"),
  metadados: jsonb("metadados").$type<Record<string, unknown>>().default({}),
  geradaEm: timestamp("gerada_em").notNull().defaultNow(),
  respondidaEm: timestamp("respondida_em"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Sugestao = typeof sugestoesTable.$inferSelect;
export type NewSugestao = typeof sugestoesTable.$inferInsert;

export const comportamentoLogsTable = pgTable("comportamento_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  tipo: text("tipo").notNull(),
  modulo: text("modulo").notNull(),
  sugestaoId: integer("sugestao_id"),
  dados: jsonb("dados").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ComportamentoLog = typeof comportamentoLogsTable.$inferSelect;
