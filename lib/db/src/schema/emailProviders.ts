import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailProvidersTable = pgTable("email_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  providerType: text("provider_type").notNull(), // brevo | resend | mailersend | mailjet | sendgrid | postmark | elasticemail | smtp2go | custom_smtp
  apiKey: text("api_key"),                        // REST API key (masked on read)
  smtpHost: text("smtp_host"),                    // for custom_smtp fallback
  smtpPort: integer("smtp_port"),
  smtpUsername: text("smtp_username"),
  smtpPassword: text("smtp_password"),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull().default("CampaignForge"),
  // Quota tracking
  dailyLimit: integer("daily_limit").notNull().default(300),
  monthlyLimit: integer("monthly_limit").notNull().default(9000),
  dailySent: integer("daily_sent").notNull().default(0),
  monthlySent: integer("monthly_sent").notNull().default(0),
  lastDailyReset: timestamp("last_daily_reset", { withTimezone: true }).notNull().defaultNow(),
  lastMonthlyReset: timestamp("last_monthly_reset", { withTimezone: true }).notNull().defaultNow(),
  // Config
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(0), // higher = preferred
  metadata: jsonb("metadata"),                        // extra provider-specific config
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEmailProviderSchema = createInsertSchema(emailProvidersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmailProvider = z.infer<typeof insertEmailProviderSchema>;
export type EmailProvider = typeof emailProvidersTable.$inferSelect;
