import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { planServices } from "./plan-services";

export const services = pgTable("services", {
	id: varchar("id", { length: 50 }).primaryKey(),
	name: varchar("name", { length: 100 }).notNull(),
	description: text("description"),
	baseUrl: varchar("base_url", { length: 500 }).notNull(),
	prefix: varchar("prefix", { length: 50 }),
	docsUrl: varchar("docs_url", { length: 500 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const servicesRelations = relations(services, ({ many }) => ({
	plans: many(planServices),
}));
