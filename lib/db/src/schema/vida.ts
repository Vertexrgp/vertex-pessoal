import { pgTable, serial, text, date, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";

// ─── Projetos ─────────────────────────────────────────────────────────────────

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

// ─── Score Pesos (por projeto) ─────────────────────────────────────────────────

export const vidaScorePesos = pgTable("vida_score_pesos", {
  id: serial("id").primaryKey(),
  projetoId: integer("projeto_id").notNull().unique(),
  pesoCusto: real("peso_custo").notNull().default(20),
  pesoRenda: real("peso_renda").notNull().default(25),
  pesoImigracao: real("peso_imigracao").notNull().default(20),
  pesoSeguranca: real("peso_seguranca").notNull().default(15),
  pesoAdaptacao: real("peso_adaptacao").notNull().default(10),
  pesoQualidade: real("peso_qualidade").notNull().default(10),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type VidaScorePesos = typeof vidaScorePesos.$inferSelect;

// ─── Cidades ──────────────────────────────────────────────────────────────────

export const vidaCidades = pgTable("vida_cidades", {
  id: serial("id").primaryKey(),
  projetoId: integer("projeto_id").notNull(),
  nome: text("nome").notNull(),
  pais: text("pais").notNull(),
  estado: text("estado"),
  moeda: text("moeda").notNull().default("USD"),
  idiomasPrincipais: text("idiomas_principais"),
  fusoHorario: text("fuso_horario"),
  clima: text("clima"),
  qualidadeVida: integer("qualidade_vida"),
  facilidadeAdaptacao: integer("facilidade_adaptacao"),
  observacoes: text("observacoes"),
  prioridade: integer("prioridade").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type VidaCidade = typeof vidaCidades.$inferSelect;
export type NewVidaCidade = typeof vidaCidades.$inferInsert;

// ─── Custo de Vida ─────────────────────────────────────────────────────────────

export const vidaCustoVida = pgTable("vida_custo_vida", {
  id: serial("id").primaryKey(),
  cidadeId: integer("cidade_id").notNull().unique(),
  // Moradia
  aluguel: real("aluguel").notNull().default(0),
  condominio: real("condominio").notNull().default(0),
  energiaGas: real("energia_gas").notNull().default(0),
  internetCelular: real("internet_celular").notNull().default(0),
  // Alimentação
  mercado: real("mercado").notNull().default(0),
  alimentacaoFora: real("alimentacao_fora").notNull().default(0),
  // Mobilidade
  transporte: real("transporte").notNull().default(0),
  // Saúde & Bem-estar
  saude: real("saude").notNull().default(0),
  academia: real("academia").notNull().default(0),
  // Outros
  lazer: real("lazer").notNull().default(0),
  impostos: real("impostos").notNull().default(0),
  custosExtras: real("custos_extras").notNull().default(0),
  // Legacy fields (kept for backward compat)
  alimentacao: real("alimentacao").notNull().default(0),
  outros: real("outros").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type VidaCustoVida = typeof vidaCustoVida.$inferSelect;

// ─── Trabalho & Renda ─────────────────────────────────────────────────────────

export const vidaTrabalho = pgTable("vida_trabalho", {
  id: serial("id").primaryKey(),
  cidadeId: integer("cidade_id").notNull().unique(),
  rendaRafael: real("renda_rafael"),
  rendaFernanda: real("renda_fernanda"),
  rendaFamiliar: real("renda_familiar"),
  faixaConservadora: real("faixa_conservadora"),
  faixaProvavel: real("faixa_provavel"),
  faixaOtimista: real("faixa_otimista"),
  demandaArea: text("demanda_area"),
  exigenciaIdioma: text("exigencia_idioma"),
  validacaoProfissional: text("validacao_profissional"),
  facilidadeRecolocacao: integer("facilidade_recolocacao"),
  observacoes: text("observacoes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type VidaTrabalho = typeof vidaTrabalho.$inferSelect;

// ─── Visto & Imigração ────────────────────────────────────────────────────────

export const vidaVisto = pgTable("vida_visto", {
  id: serial("id").primaryKey(),
  cidadeId: integer("cidade_id").notNull().unique(),
  tipoVisto: text("tipo_visto"),
  dificuldadeEstudo: integer("dificuldade_estudo"),
  dificuldadeTrabalho: integer("dificuldade_trabalho"),
  dificuldadePermanente: integer("dificuldade_permanente"),
  tempoEstimado: text("tempo_estimado"),
  custoProcesso: real("custo_processo"),
  necessidadeJobOffer: boolean("necessidade_job_offer").default(false),
  exigenciaIdioma: text("exigencia_idioma"),
  observacoes: text("observacoes"),
  notaViabilidade: integer("nota_viabilidade"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type VidaVisto = typeof vidaVisto.$inferSelect;

// ─── Qualidade de Vida ────────────────────────────────────────────────────────

export const vidaQualidade = pgTable("vida_qualidade", {
  id: serial("id").primaryKey(),
  cidadeId: integer("cidade_id").notNull().unique(),
  seguranca: integer("seguranca"),
  saude: integer("saude"),
  transportePublico: integer("transporte_publico"),
  clima: integer("clima"),
  comunidadeBrasileira: integer("comunidade_brasileira"),
  adaptacao: integer("adaptacao"),
  qualidadeFamilia: integer("qualidade_familia"),
  qualidadeCarreira: integer("qualidade_carreira"),
  potencialFinanceiro: integer("potencial_financeiro"),
  observacoes: text("observacoes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type VidaQualidade = typeof vidaQualidade.$inferSelect;

// ─── Prós e Contras ───────────────────────────────────────────────────────────

export const vidaProsContras = pgTable("vida_pros_contras", {
  id: serial("id").primaryKey(),
  cidadeId: integer("cidade_id").notNull(),
  tipo: text("tipo").notNull(),
  descricao: text("descricao").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type VidaProContra = typeof vidaProsContras.$inferSelect;

// ─── Plano de Ação ────────────────────────────────────────────────────────────

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

// ─── Checkpoints ──────────────────────────────────────────────────────────────

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
