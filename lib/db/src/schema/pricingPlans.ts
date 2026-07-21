import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pricingPlansTable = pgTable("pricing_plans", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),           // free | starter | pro | business | enterprise
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  priceMonthly: integer("price_monthly").notNull().default(0),  // in cents
  priceYearly: integer("price_yearly").notNull().default(0),    // in cents
  features: jsonb("features").notNull().default([]),            // string[]
  limits: jsonb("limits").notNull().default({}),                // { subscribers, emailsPerMonth, workspaces, teamMembers }
  isActive: boolean("is_active").notNull().default(true),
  isPopular: boolean("is_popular").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPricingPlanSchema = createInsertSchema(pricingPlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPricingPlan = z.infer<typeof insertPricingPlanSchema>;
export type PricingPlan = typeof pricingPlansTable.$inferSelect;
