import { relations } from "drizzle-orm";
import { decimal, integer, jsonb, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { planServices } from "./plan-services";

export const plans = pgTable("plans", {
	planId: varchar("plan_id", { length: 50 }).primaryKey(),
	name: varchar("name", { length: 100 }).notNull(),
	description: text("description"),
	rateLimit: integer("rate_limit").notNull(),
	rateInterval: varchar("rate_interval", { length: 20 }).notNull(),
	priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }),
	features: jsonb("features").$type<string[]>().default([]),
	reqPerMinute: integer("req_per_minute"),
	purchaseLink: text("purchase_link"),
});

export const plansRelations = relations(plans, ({ many }) => ({
	services: many(planServices),
}));
