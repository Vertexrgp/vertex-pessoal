import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const idiomaConfig = pgTable("idioma_config", {
  id: serial("id").primaryKey(),
  idioma: text("idioma").notNull().default("ingles"),
  nivelAtual: text("nivel_atual").notNull().default("B1"),
  nivelMeta: text("nivel_meta").notNull().default("B2"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const idiomaSessoes = pgTable("idioma_sessoes", {
  id: serial("id").primaryKey(),
  idioma: text("idioma").notNull().default("ingles"),
  data: text("data").notNull(),
  duracao: integer("duracao"),
  tipo: text("tipo"),
  concluida: boolean("concluida").notNull().default(false),
  notas: text("notas"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const idiomaVocabulario = pgTable("idioma_vocabulario", {
  id: serial("id").primaryKey(),
  idioma: text("idioma").notNull().default("ingles"),
  palavra: text("palavra").notNull(),
  traducao: text("traducao").notNull(),
  nivel: text("nivel"),
  aprendida: boolean("aprendida").notNull().default(false),
  notas: text("notas"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
