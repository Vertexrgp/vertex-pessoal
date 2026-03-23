import { pgTable, serial, text, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";

export const eventsLogTable = pgTable("events_log", {
  id: serial("id").primaryKey(),
  tipo: text("tipo").notNull(),
  origem: text("origem").notNull(),
  descricao: text("descricao"),
  payload: jsonb("payload"),
  lido: boolean("lido").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type EventLog = typeof eventsLogTable.$inferSelect;
