import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const smtpConnectionsTable = pgTable("smtp_connections", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  name: text("name").notNull(),
  provider: text("provider").notNull().default("custom"),
  host: text("host").notNull(),
  port: integer("port").notNull().default(587),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  tls: boolean("tls").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  dailySentCount: integer("daily_sent_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSmtpConnectionSchema = createInsertSchema(smtpConnectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSmtpConnection = z.infer<typeof insertSmtpConnectionSchema>;
export type SmtpConnection = typeof smtpConnectionsTable.$inferSelect;
