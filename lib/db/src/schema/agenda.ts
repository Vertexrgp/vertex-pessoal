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
  viagemId: integer("viagem_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AgendaEvent = typeof agendaEventsTable.$inferSelect;

// ─── Recurring Series ─────────────────────────────────────────────────────────

export const agendaRecurringSeriesTable = pgTable("agenda_recurring_series", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  prioridade: text("prioridade").notNull().default("media"),
  categoria: text("categoria"),
  estimativaTempo: text("estimativa_tempo"),
  observacao: text("observacao"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  recurrenceType: text("recurrence_type").notNull(),
  recurrenceInterval: integer("recurrence_interval").notNull().default(1),
  recurrenceDays: text("recurrence_days"),
  startDate: date("start_date").notNull(),
  recurrenceEndDate: date("recurrence_end_date"),
  generatedUntil: date("generated_until").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AgendaRecurringSeries = typeof agendaRecurringSeriesTable.$inferSelect;

// ─── Planner Tasks ────────────────────────────────────────────────────────────

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
  scheduledDate: date("scheduled_date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  recurringSeriesId: integer("recurring_series_id"),
  isRecurringException: boolean("is_recurring_exception").notNull().default(false),
  ordem: integer("ordem").notNull().default(0),
  observacao: text("observacao"),
  postergadaCount: integer("postergada_count").notNull().default(0),
  isFoco: boolean("is_foco").notNull().default(false),
  goalId: integer("goal_id"),
  checkpointId: integer("checkpoint_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AgendaPlannerTask = typeof agendaPlannerTasksTable.$inferSelect;
