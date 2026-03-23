import { pgTable, serial, text, date, numeric, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const viagensTripsTable = pgTable("viagens_trips", {
  id: serial("id").primaryKey(),
  destino: text("destino").notNull(),
  dataInicio: date("data_inicio"),
  dataFim: date("data_fim"),
  orcamento: numeric("orcamento", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("planejando"),
  descricao: text("descricao"),
  capaUrl: text("capa_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const viagensExpensesTable = pgTable("viagens_expenses", {
  id: serial("id").primaryKey(),
  viagemId: integer("viagem_id").references(() => viagensTripsTable.id),
  descricao: text("descricao").notNull(),
  valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
  categoria: text("categoria").notNull().default("outros"),
  data: date("data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const viagensChecklistTable = pgTable("viagens_checklist", {
  id: serial("id").primaryKey(),
  viagemId: integer("viagem_id").references(() => viagensTripsTable.id),
  item: text("item").notNull(),
  concluido: boolean("concluido").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const viagensRoteiroTable = pgTable("viagens_roteiro", {
  id: serial("id").primaryKey(),
  viagemId: integer("viagem_id").references(() => viagensTripsTable.id),
  dia: integer("dia").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  hora: text("hora"),
  ordem: integer("ordem").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ViagemTrip = typeof viagensTripsTable.$inferSelect;
export type ViagemExpense = typeof viagensExpensesTable.$inferSelect;
export type ViagemChecklist = typeof viagensChecklistTable.$inferSelect;
export type ViagemRoteiro = typeof viagensRoteiroTable.$inferSelect;
