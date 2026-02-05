import { relations } from "drizzle-orm";
import { integer, pgTable, primaryKey, timestamp, varchar } from "drizzle-orm/pg-core";
import { plans } from "./plans";
import { services } from "./services";

export const planServices = pgTable(
	"plan_services",
	{
		planId: varchar("plan_id", { length: 50 })
			.notNull()
			.references(() => plans.planId, { onDelete: "cascade" }),
		serviceId: varchar("service_id", { length: 50 })
			.notNull()
			.references(() => services.id, { onDelete: "cascade" }),
		dailyLimit: integer("daily_limit"),
		monthlyLimit: integer("monthly_limit"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [primaryKey({ columns: [table.planId, table.serviceId] })]
);

export const planServicesRelations = relations(planServices, ({ one }) => ({
	plan: one(plans, {
		fields: [planServices.planId],
		references: [plans.planId],
	}),
	service: one(services, {
		fields: [planServices.serviceId],
		references: [services.id],
	}),
}));
