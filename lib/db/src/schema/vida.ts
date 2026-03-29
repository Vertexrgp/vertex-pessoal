import { pgTable, serial, text, date, timestamp, integer, real } from "drizzle-orm/pg-core";

export const vidaProjetos = pgTable("vida_projetos", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  tipo: text("tipo").notNull().default("mudanca_pais"),
  status: text("status").notNull().default("explorando"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type VidaProjeto = typeof vidaProjetos.$inferSelect;
export type NewVidaProjeto = typeof vidaProjetos.$inferInsert;

export const vidaCidades = pgTable("vida_cidades", {
  id: serial("id").primaryKey(),
  projetoId: integer("projeto_id").notNull(),
  nome: text("nome").notNull(),
  pais: text("pais").notNull(),
  moeda: text("moeda").notNull().default("USD"),
  qualidadeVida: integer("qualidade_vida"),
  facilidadeAdaptacao: integer("facilidade_adaptacao"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type VidaCidade = typeof vidaCidades.$inferSelect;
export type NewVidaCidade = typeof vidaCidades.$inferInsert;

export const vidaCustoVida = pgTable("vida_custo_vida", {
  id: serial("id").primaryKey(),
  cidadeId: integer("cidade_id").notNull().unique(),
  aluguel: real("aluguel").notNull().default(0),
  transporte: real("transporte").notNull().default(0),
  alimentacao: real("alimentacao").notNull().default(0),
  saude: real("saude").notNull().default(0),
  impostos: real("impostos").notNull().default(0),
  lazer: real("lazer").notNull().default(0),
  outros: real("outros").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type VidaCustoVida = typeof vidaCustoVida.$inferSelect;

export const vidaProsContras = pgTable("vida_pros_contras", {
  id: serial("id").primaryKey(),
  cidadeId: integer("cidade_id").notNull(),
  tipo: text("tipo").notNull(),
  descricao: text("descricao").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type VidaProContra = typeof vidaProsContras.$inferSelect;

export const vidaPlanoAcao = pgTable("vida_plano_acao", {
  id: serial("id").primaryKey(),
  projetoId: integer("projeto_id").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  prazo: date("prazo"),
  status: text("status").notNull().default("pendente"),
  ordem: integer("ordem").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type VidaPlanoAcao = typeof vidaPlanoAcao.$inferSelect;

export const vidaCheckpoints = pgTable("vida_checkpoints", {
  id: serial("id").primaryKey(),
  projetoId: integer("projeto_id").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  dataAlvo: date("data_alvo"),
  status: text("status").notNull().default("pendente"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type VidaCheckpoint = typeof vidaCheckpoints.$inferSelect;
