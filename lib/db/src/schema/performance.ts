import { pgTable, serial, text, numeric, date, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const performanceGoalsTable = pgTable("performance_goals", {
  id: serial("id").primaryKey(),
  fotoUrl: text("foto_url"),
  descricao: text("descricao").notNull(),
  metaPeso: numeric("meta_peso", { precision: 6, scale: 2 }),
  metaBf: numeric("meta_bf", { precision: 5, scale: 2 }),
  metaEstetica: text("meta_estetica"),
  prazo: date("prazo"),
  motivacao: text("motivacao"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const performanceCurrentStateTable = pgTable("performance_current_state", {
  id: serial("id").primaryKey(),
  dataAvaliacao: date("data_avaliacao").notNull(),
  peso: numeric("peso", { precision: 6, scale: 2 }),
  altura: numeric("altura", { precision: 5, scale: 2 }),
  bf: numeric("bf", { precision: 5, scale: 2 }),
  cintura: numeric("cintura", { precision: 6, scale: 1 }),
  quadril: numeric("quadril", { precision: 6, scale: 1 }),
  torax: numeric("torax", { precision: 6, scale: 1 }),
  braco: numeric("braco", { precision: 6, scale: 1 }),
  coxa: numeric("coxa", { precision: 6, scale: 1 }),
  fotosUrls: jsonb("fotos_urls").$type<string[]>().default([]),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const performanceExamsTable = pgTable("performance_exams", {
  id: serial("id").primaryKey(),
  tipo: text("tipo").notNull(),
  data: date("data").notNull(),
  laboratorio: text("laboratorio"),
  arquivoUrl: text("arquivo_url"),
  arquivoNome: text("arquivo_nome"),
  resultados: text("resultados"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const performanceProtocolsTable = pgTable("performance_protocols", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(), // manipulado | medicamento | suplemento | hormonio
  principioAtivo: text("principio_ativo"),
  dosagem: text("dosagem").notNull(),
  unidade: text("unidade"),
  horarios: jsonb("horarios").$type<string[]>().default([]),
  frequencia: text("frequencia").notNull().default("diario"),
  viaAdministracao: text("via_administracao"),
  cicloInicio: date("ciclo_inicio"),
  cicloFim: date("ciclo_fim"),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const performanceWorkoutsTable = pgTable("performance_workouts", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  letra: text("letra"),
  diaSemana: text("dia_semana"),
  grupoMuscular: text("grupo_muscular"),
  exercicios: jsonb("exercicios").$type<{
    nome: string;
    series: number;
    reps: string;
    carga: string;
    descanso: string;
    observacao: string;
  }[]>().default([]),
  duracaoMin: integer("duracao_min"),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").notNull().default(true),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const performanceNutritionTable = pgTable("performance_nutrition", {
  id: serial("id").primaryKey(),
  estrategia: text("estrategia").notNull(),
  calorias: integer("calorias"),
  proteina: numeric("proteina", { precision: 6, scale: 1 }),
  carboidrato: numeric("carboidrato", { precision: 6, scale: 1 }),
  gordura: numeric("gordura", { precision: 6, scale: 1 }),
  refeicoes: jsonb("refeicoes").$type<{
    nome: string;
    horario: string;
    descricao: string;
    calorias: number;
  }[]>().default([]),
  suplementos: text("suplementos"),
  observacoes: text("observacoes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const performanceProgressTable = pgTable("performance_progress", {
  id: serial("id").primaryKey(),
  data: date("data").notNull(),
  peso: numeric("peso", { precision: 6, scale: 2 }),
  bf: numeric("bf", { precision: 5, scale: 2 }),
  cintura: numeric("cintura", { precision: 6, scale: 1 }),
  fotoUrl: text("foto_url"),
  humor: text("humor"),
  energia: integer("energia"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const performanceExamMarkersTable = pgTable("performance_exam_markers", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull(),
  marcador: text("marcador").notNull(),
  valor: numeric("valor", { precision: 12, scale: 4 }).notNull(),
  unidade: text("unidade"),
  refMin: numeric("ref_min", { precision: 12, scale: 4 }),
  refMax: numeric("ref_max", { precision: 12, scale: 4 }),
  status: text("status").notNull().default("normal"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const performanceMealPlansTable = pgTable("performance_meal_plans", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  prescritoPor: text("prescrito_por"),
  dataInicio: date("data_inicio"),
  dataFim: date("data_fim"),
  objetivo: text("objetivo"),
  ativo: boolean("ativo").notNull().default(true),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const performanceMealsTable = pgTable("performance_meals", {
  id: serial("id").primaryKey(),
  planoId: integer("plano_id").notNull(),
  nome: text("nome").notNull(),
  horario: text("horario"),
  alimentos: jsonb("alimentos").$type<{
    nome: string;
    quantidade: string;
    unidade: string;
    calorias?: number;
    observacao?: string;
  }[]>().default([]),
  observacoes: text("observacoes"),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PerformanceExamMarker = typeof performanceExamMarkersTable.$inferSelect;
export type PerformanceMealPlan = typeof performanceMealPlansTable.$inferSelect;
export type PerformanceMeal = typeof performanceMealsTable.$inferSelect;

/* ─── Objetivo Físico ─────────────────────────────────────────────────────── */
export const performanceBodyGoalTable = pgTable("performance_body_goal", {
  id: serial("id").primaryKey(),
  pesoAtual: numeric("peso_atual", { precision: 6, scale: 2 }),
  bfAtual: numeric("bf_atual", { precision: 5, scale: 2 }),
  pesoAlvo: numeric("peso_alvo", { precision: 6, scale: 2 }),
  bfAlvo: numeric("bf_alvo", { precision: 5, scale: 2 }),
  prazo: date("prazo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const performanceBodyPhotosTable = pgTable("performance_body_photos", {
  id: serial("id").primaryKey(),
  tipo: text("tipo").notNull(), // objetivo | atual_frente | atual_lado | atual_costas
  imageData: text("image_data").notNull(),
  goalId: integer("goal_id").references(() => performanceBodyGoalTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PerformanceGoal = typeof performanceGoalsTable.$inferSelect;
export type PerformanceCurrentState = typeof performanceCurrentStateTable.$inferSelect;
export type PerformanceExam = typeof performanceExamsTable.$inferSelect;
export type PerformanceProtocol = typeof performanceProtocolsTable.$inferSelect;
export type PerformanceWorkout = typeof performanceWorkoutsTable.$inferSelect;
export type PerformanceNutrition = typeof performanceNutritionTable.$inferSelect;
export type PerformanceProgress = typeof performanceProgressTable.$inferSelect;
export type PerformanceBodyGoal = typeof performanceBodyGoalTable.$inferSelect;
export type PerformanceBodyPhoto = typeof performanceBodyPhotosTable.$inferSelect;
