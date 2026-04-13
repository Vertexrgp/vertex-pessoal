// Destino: lib/db/src/schema/centro-comando.ts
// Tabela única que armazena o estado do Centro de Comando como arquivos key/value.
// Cada registro é um "arquivo lógico" sincronizado do Mac (CLAUDE.md, TASKS.md, memory/*.md).
//
// Padrão de keys:
//   brain                      -> CLAUDE.md
//   tasks                      -> TASKS.md
//   memory/content-youtube     -> memory/content-youtube.md
//   memory/products-ideas      -> memory/products-ideas.md
//   ...
//
// userId fixado em 1 segue o padrão das outras tabelas do workspace.

import { pgTable, serial, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

export const centroComandoFiles = pgTable(
  "centro_comando_files",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().default(1),
    fileKey: text("file_key").notNull(),           // ex: "brain", "tasks", "memory/content-youtube"
    category: text("category").notNull(),          // "brain" | "tasks" | "memory"
    content: text("content").notNull(),            // conteúdo bruto em Markdown
    contentHash: text("content_hash"),             // SHA-256 hex do content (pra detectar no-op)
    source: text("source").notNull().default("mac"), // "mac" | "replit" | "seed"
    syncedAt: timestamp("synced_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    userFileUnique: uniqueIndex("centro_comando_files_user_key_unique").on(t.userId, t.fileKey),
    categoryIdx: index("centro_comando_files_category_idx").on(t.category),
    syncedAtIdx: index("centro_comando_files_synced_at_idx").on(t.syncedAt),
  }),
);

export type CentroComandoFile = typeof centroComandoFiles.$inferSelect;
export type NewCentroComandoFile = typeof centroComandoFiles.$inferInsert;

// Log de sync (útil pra debug do watcher e pra timeline de atividade)
export const centroComandoSyncLog = pgTable("centro_comando_sync_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  fileKey: text("file_key").notNull(),
  action: text("action").notNull(),  // "upsert" | "delete" | "noop"
  bytesBefore: integer("bytes_before"),
  bytesAfter: integer("bytes_after"),
  source: text("source").notNull().default("mac"),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CentroComandoSyncLog = typeof centroComandoSyncLog.$inferSelect;
export type NewCentroComandoSyncLog = typeof centroComandoSyncLog.$inferInsert;
