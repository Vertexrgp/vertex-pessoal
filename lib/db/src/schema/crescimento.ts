import { pgTable, serial, text, date, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const growthGoals = pgTable("growth_goals", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  tipo: text("tipo").notNull().default("pessoal"),
  prazo: date("prazo"),
  status: text("status").notNull().default("ativa"),
  prioridade: text("prioridade").notNull().default("media"),
  progresso: integer("progresso").notNull().default(0),
  cor: text("cor").notNull().default("#6366F1"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GrowthGoal = typeof growthGoals.$inferSelect;
export type NewGrowthGoal = typeof growthGoals.$inferInsert;

export const growthObjectives = pgTable("growth_objectives", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  status: text("status").notNull().default("pendente"),
  ordem: integer("ordem").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GrowthObjective = typeof growthObjectives.$inferSelect;

export const growthPlans = pgTable("growth_plans", {
  id: serial("id").primaryKey(),
  objectiveId: integer("objective_id").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  status: text("status").notNull().default("pendente"),
  ordem: integer("ordem").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type GrowthPlan = typeof growthPlans.$inferSelect;

export const growthCheckpoints = pgTable("growth_checkpoints", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  data: date("data"),
  concluido: boolean("concluido").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type GrowthCheckpoint = typeof growthCheckpoints.$inferSelect;

export const growthVision = pgTable("growth_vision", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  tipo: text("tipo").notNull().default("frase"),
  conteudo: text("conteudo").notNull(),
  categoria: text("categoria").notNull().default("geral"),
  goalId: integer("goal_id"),
  cor: text("cor").notNull().default("#6366F1"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type GrowthVision = typeof growthVision.$inferSelect;
