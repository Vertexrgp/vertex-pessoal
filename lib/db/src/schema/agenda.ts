import { pgTable, serial, text, date, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const agendaEventsTable = pgTable("agenda_events", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  data: date("data").notNull(),
  horaInicio: text("hora_inicio"),
  horaFim: text("hora_fim"),
  descricao: text("descricao"),
  categoria: text("categoria").notNull().default("pessoal"),
  alerta: boolean("alerta").notNull().default(false),
  lembrete: boolean("lembrete").notNull().default(false),
  cor: text("cor").default("#6366F1"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AgendaEvent = typeof agendaEventsTable.$inferSelect;

export const agendaPlannerTasksTable = pgTable("agenda_planner_tasks", {
  id: serial("id").primaryKey(),
  semanaInicio: date("semana_inicio").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  prioridade: text("prioridade").notNull().default("media"),
  categoria: text("categoria"),
  estimativaTempo: text("estimativa_tempo"),
  status: text("status").notNull().default("pendente"),
  diaSemana: text("dia_semana"),
  ordem: integer("ordem").notNull().default(0),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AgendaPlannerTask = typeof agendaPlannerTasksTable.$inferSelect;
