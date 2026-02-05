import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const siteSettings = pgTable("site_settings", {
	key: varchar("key", { length: 100 }).primaryKey(),
	value: text("value"),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
