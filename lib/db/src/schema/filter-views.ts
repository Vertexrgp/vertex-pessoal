import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const filterViewsTable = pgTable("filter_views", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  filters: jsonb("filters").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type FilterView = typeof filterViewsTable.$inferSelect;
export type NewFilterView = typeof filterViewsTable.$inferInsert;
