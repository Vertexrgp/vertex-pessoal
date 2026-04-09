import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const importBatchesTable = pgTable("import_batches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  totalItems: integer("total_items").notNull().default(0),
  importedItems: integer("imported_items").notNull().default(0),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
