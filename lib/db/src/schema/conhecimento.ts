import { pgTable, serial, text, date, integer, timestamp } from "drizzle-orm/pg-core";

export const conhecimentoLivros = pgTable("conhecimento_livros", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  autor: text("autor").notNull(),
  genero: text("genero").notNull().default("geral"),
  status: text("status").notNull().default("quero_ler"),
  progresso: integer("progresso").notNull().default(0),
  nota: integer("nota").notNull().default(0),
  dataInicio: date("data_inicio"),
  dataFim: date("data_fim"),
  resumo: text("resumo"),
  cor: text("cor").notNull().default("#F59E0B"),
  totalPaginas: integer("total_paginas"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ConhecimentoLivro = typeof conhecimentoLivros.$inferSelect;
export type NewConhecimentoLivro = typeof conhecimentoLivros.$inferInsert;

export const conhecimentoFrases = pgTable("conhecimento_frases", {
  id: serial("id").primaryKey(),
  livroId: integer("livro_id").notNull(),
  frase: text("frase").notNull(),
  pagina: text("pagina"),
  tag: text("tag"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ConhecimentoFrase = typeof conhecimentoFrases.$inferSelect;

export const conhecimentoInsights = pgTable("conhecimento_insights", {
  id: serial("id").primaryKey(),
  livroId: integer("livro_id").notNull(),
  conteudo: text("conteudo").notNull(),
  tag: text("tag"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ConhecimentoInsight = typeof conhecimentoInsights.$inferSelect;
