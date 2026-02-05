import { relations } from "drizzle-orm";
import {
	date,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const requestLogs = pgTable(
	"request_logs",
	{
		logId: uuid("log_id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id),
		timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
		endpoint: varchar("endpoint", { length: 500 }).notNull(),
		method: varchar("method", { length: 10 }).notNull(),
		statusCode: integer("status_code").notNull(),
		latencyMs: integer("latency_ms").notNull(),
		ipAddress: varchar("ip_address", { length: 45 }),
		queryParams: jsonb("query_params"),
		requestHeaders: jsonb("request_headers"),
		requestBody: text("request_body"),
		responseHeaders: jsonb("response_headers"),
		responseBody: text("response_body"),
	},
	(table) => ({
		logUserIdIdx: index("log_user_id_idx").on(table.userId),
		logTimestampIdx: index("log_timestamp_idx").on(table.timestamp),
	})
);

export const logSummaries = pgTable(
	"log_summaries",
	{
		summaryId: uuid("summary_id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id),
		date: date("date").notNull(),
		totalRequests: integer("total_requests").notNull(),
		successfulRequests: integer("successful_requests").notNull(),
		failedRequests: integer("failed_requests").notNull(),
		averageLatencyMs: numeric("average_latency_ms", {
			precision: 10,
			scale: 2,
		}).notNull(),
		endpointUsage: jsonb("endpoint_usage"),
		lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		userDateUnique: unique("user_date_unique").on(table.userId, table.date),
	})
);

export const requestLogsRelations = relations(requestLogs, ({ one }) => ({
	user: one(user, {
		fields: [requestLogs.userId],
		references: [user.id],
	}),
}));

export const logSummariesRelations = relations(logSummaries, ({ one }) => ({
	user: one(user, {
		fields: [logSummaries.userId],
		references: [user.id],
	}),
}));
