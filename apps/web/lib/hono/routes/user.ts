import { auth } from "@gate/auth";
import {
	and,
	count,
	db,
	desc,
	eq,
	gte,
	logSummaries,
	lte,
	requestLogs,
	user,
} from "@gate/database";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { headers } from "next/headers";
import { z } from "zod";

function generateApiKey(): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const randomPart = Array.from(
		{ length: 32 },
		() => chars[Math.floor(Math.random() * chars.length)]
	).join("");
	return `pk_live_${randomPart}`;
}

async function hashApiKey(key: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(key);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getSession() {
	const headersList = await headers();
	const session = await auth.api.getSession({
		headers: headersList,
	});
	return session;
}

export const userRoutes = new Hono()
	.post("/apikey/generate", async (c) => {
		const session = await getSession();
		if (!session?.user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const apiKey = generateApiKey();
		const apiKeyHash = await hashApiKey(apiKey);

		await db
			.update(user)
			.set({
				apiKey,
				apiKeyHash,
			})
			.where(eq(user.id, session.user.id));

		return c.json({ success: true, apiKey });
	})
	.put(
		"/profile",
		zValidator(
			"json",
			z.object({
				name: z.string().min(1, "Name is required"),
			})
		),
		async (c) => {
			const session = await getSession();
			if (!session?.user) {
				return c.json({ error: "Unauthorized" }, 401);
			}

			const { name } = c.req.valid("json");

			await db.update(user).set({ name }).where(eq(user.id, session.user.id));

			return c.json({ success: true });
		}
	)
	.put(
		"/password",
		zValidator(
			"json",
			z.object({
				currentPassword: z.string().min(1, "Current password is required"),
				newPassword: z.string().min(8, "New password must be at least 8 characters"),
			})
		),
		async (c) => {
			const session = await getSession();
			if (!session?.user) {
				return c.json({ error: "Unauthorized" }, 401);
			}

			const { currentPassword, newPassword } = c.req.valid("json");

			const headersList = await headers();
			try {
				const result = await auth.api.changePassword({
					headers: headersList,
					body: {
						currentPassword,
						newPassword,
					},
				});

				if (!result) {
					return c.json({ error: "Failed to change password" }, 400);
				}

				return c.json({ success: true });
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : "Failed to change password";
				return c.json({ error: message }, 400);
			}
		}
	)
	.get(
		"/logs",
		zValidator(
			"query",
			z.object({
				page: z.coerce.number().min(1).default(1),
				limit: z.coerce.number().min(1).max(100).default(20),
			})
		),
		async (c) => {
			const session = await getSession();
			if (!session?.user) {
				return c.json({ success: false, error: "Unauthorized" }, 401);
			}

			const { page, limit } = c.req.valid("query");
			const offset = (page - 1) * limit;

			const logs = await db
				.select({
					logId: requestLogs.logId,
					timestamp: requestLogs.timestamp,
					endpoint: requestLogs.endpoint,
					method: requestLogs.method,
					statusCode: requestLogs.statusCode,
					latencyMs: requestLogs.latencyMs,
					ipAddress: requestLogs.ipAddress,
				})
				.from(requestLogs)
				.where(eq(requestLogs.userId, session.user.id))
				.orderBy(desc(requestLogs.timestamp))
				.limit(limit)
				.offset(offset);

			const [countResult] = await db
				.select({ count: count() })
				.from(requestLogs)
				.where(eq(requestLogs.userId, session.user.id));

			const total = Number(countResult?.count) || 0;
			const totalPages = Math.ceil(total / limit);

			return c.json({
				success: true,
				data: {
					logs: logs.map((log) => ({
						id: log.logId,
						timestamp: log.timestamp?.toISOString() || "",
						endpoint: log.endpoint,
						method: log.method,
						statusCode: log.statusCode,
						latencyMs: log.latencyMs,
						ipAddress: log.ipAddress || "",
					})),
					pagination: {
						page,
						limit,
						total,
						totalPages,
					},
				},
			});
		}
	)
	.get("/logs/:id", async (c) => {
		const session = await getSession();
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}

		const logId = c.req.param("id");

		const [log] = await db
			.select()
			.from(requestLogs)
			.where(and(eq(requestLogs.logId, logId), eq(requestLogs.userId, session.user.id)));

		if (!log) {
			return c.json({ success: false, error: "Log not found" }, 404);
		}

		return c.json({
			success: true,
			data: {
				id: log.logId,
				timestamp: log.timestamp?.toISOString() || "",
				endpoint: log.endpoint,
				method: log.method,
				statusCode: log.statusCode,
				latencyMs: log.latencyMs,
				ipAddress: log.ipAddress || "",
				queryParams: log.queryParams,
				requestHeaders: log.requestHeaders,
				requestBody: log.requestBody,
				responseHeaders: log.responseHeaders,
				responseBody: log.responseBody,
			},
		});
	})
	.get(
		"/log-summaries",
		zValidator(
			"query",
			z.object({
				page: z.coerce.number().min(1).default(1),
				limit: z.coerce.number().min(1).max(100).default(20),
				startDate: z.string().optional(),
				endDate: z.string().optional(),
			})
		),
		async (c) => {
			const session = await getSession();
			if (!session?.user) {
				return c.json({ success: false, error: "Unauthorized" }, 401);
			}

			const { page, limit, startDate, endDate } = c.req.valid("query");
			const offset = (page - 1) * limit;

			const conditions = [eq(logSummaries.userId, session.user.id)];
			if (startDate) {
				conditions.push(gte(logSummaries.date, startDate));
			}
			if (endDate) {
				conditions.push(lte(logSummaries.date, endDate));
			}

			const whereClause = and(...conditions);

			const summaries = await db
				.select({
					summaryId: logSummaries.summaryId,
					date: logSummaries.date,
					totalRequests: logSummaries.totalRequests,
					successfulRequests: logSummaries.successfulRequests,
					failedRequests: logSummaries.failedRequests,
					averageLatencyMs: logSummaries.averageLatencyMs,
					endpointUsage: logSummaries.endpointUsage,
					lastUpdated: logSummaries.lastUpdated,
				})
				.from(logSummaries)
				.where(whereClause)
				.orderBy(desc(logSummaries.date))
				.limit(limit)
				.offset(offset);

			const [countResult] = await db
				.select({ count: count() })
				.from(logSummaries)
				.where(whereClause);

			const total = Number(countResult?.count) || 0;
			const totalPages = Math.ceil(total / limit);

			return c.json({
				success: true,
				data: {
					summaries: summaries.map((s) => ({
						id: s.summaryId,
						date: s.date,
						totalRequests: s.totalRequests,
						successfulRequests: s.successfulRequests,
						failedRequests: s.failedRequests,
						averageLatencyMs: Number(s.averageLatencyMs),
						endpointUsage: s.endpointUsage,
						lastUpdated: s.lastUpdated?.toISOString() || "",
					})),
					pagination: {
						page,
						limit,
						total,
						totalPages,
					},
				},
			});
		}
	)
	.get("/log-summaries/:id", async (c) => {
		const session = await getSession();
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}

		const summaryId = c.req.param("id");

		const [summary] = await db
			.select()
			.from(logSummaries)
			.where(and(eq(logSummaries.summaryId, summaryId), eq(logSummaries.userId, session.user.id)));

		if (!summary) {
			return c.json({ success: false, error: "Summary not found" }, 404);
		}

		return c.json({
			success: true,
			data: {
				id: summary.summaryId,
				date: summary.date,
				totalRequests: summary.totalRequests,
				successfulRequests: summary.successfulRequests,
				failedRequests: summary.failedRequests,
				averageLatencyMs: Number(summary.averageLatencyMs),
				endpointUsage: summary.endpointUsage,
				lastUpdated: summary.lastUpdated?.toISOString() || "",
			},
		});
	});
