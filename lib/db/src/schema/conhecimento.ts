import { pgTable, serial, text, date, integer, timestamp, boolean } from "drizzle-orm/pg-core";

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
  capa: text("capa"),
  favorito: boolean("favorito").notNull().default(false),
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

export const conhecimentoArtigos = pgTable("conhecimento_artigos", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  fonte: text("fonte"),
  tema: text("tema").notNull().default("geral"),
  dataLeitura: date("data_leitura"),
  resumo: text("resumo"),
  cor: text("cor").notNull().default("#6366F1"),
  favorito: boolean("favorito").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ConhecimentoArtigo = typeof conhecimentoArtigos.$inferSelect;

export const conhecimentoArtigoInsights = pgTable("conhecimento_artigo_insights", {
  id: serial("id").primaryKey(),
  artigoId: integer("artigo_id").notNull(),
  conteudo: text("conteudo").notNull(),
  tag: text("tag"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ConhecimentoArtigoInsight = typeof conhecimentoArtigoInsights.$inferSelect;

// ── VÍDEOS ───────────────────────────────────────────────────────────────────
export const conhecimentoVideos = pgTable("conhecimento_videos", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  link: text("link"),
  plataforma: text("plataforma").notNull().default("YouTube"),
  categoria: text("categoria").notNull().default("Outros"),
  tema: text("tema"),
  thumbnail: text("thumbnail"),
  status: text("status").notNull().default("quero_ver"),
  dataInicio: date("data_inicio"),
  dataFim: date("data_fim"),
  resumo: text("resumo"),
  insights: text("insights"),
  pontosImportantes: text("pontos_importantes"),
  frasesMarcantes: text("frases_marcantes"),
  favorito: boolean("favorito").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ConhecimentoVideo = typeof conhecimentoVideos.$inferSelect;
export type NewConhecimentoVideo = typeof conhecimentoVideos.$inferInsert;
