import { auth } from "@gate/auth";
import {
	and,
	asc,
	count,
	db,
	desc,
	eq,
	gte,
	like,
	logSummaries,
	lte,
	planServices,
	plans,
	requestLogs,
	services,
	siteSettings,
	user,
} from "@gate/database";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

async function getSessionFromRequest(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	return session;
}

function generateServiceId(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 50);
}

const createPlanSchema = z.object({
	planId: z.string().min(1),
	name: z.string().min(1),
	description: z.string().optional(),
	rateLimit: z.number().min(1),
	rateInterval: z.string().min(1),
	priceMonthly: z.string().optional(),
	features: z.array(z.string()).optional(),
	reqPerMinute: z.number().min(1).optional(),
	purchaseLink: z.string().optional(),
});

const updatePlanSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	rateLimit: z.number().min(1),
	rateInterval: z.string().min(1),
	priceMonthly: z.string().optional(),
	features: z.array(z.string()).optional(),
	reqPerMinute: z.number().min(1).optional().nullable(),
	purchaseLink: z.string().optional().nullable(),
});

const planServiceSchema = z.object({
	serviceId: z.string().min(1),
	dailyLimit: z.union([z.number().min(0), z.null()]).optional(),
	monthlyLimit: z.union([z.number().min(0), z.null()]).optional(),
});

const updateUserPlanSchema = z.object({
	planId: z.string().min(1),
	expiresAt: z.string().optional(),
});

const renewPlanSchema = z.object({
	months: z.number().min(1),
});

const setApiKeySchema = z.object({
	apiKey: z.string().min(1),
});

const createServiceSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	baseUrl: z.string().min(1),
	prefix: z.string().optional(),
	docsUrl: z.string().optional(),
});

const updateServiceSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	baseUrl: z.string().min(1),
	prefix: z.string().optional(),
	docsUrl: z.string().optional(),
	isActive: z.boolean().optional(),
});

export const adminRoutes = new Hono()
	// Plans CRUD
	.post("/plans", zValidator("json", createPlanSchema), async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const {
			planId,
			name,
			description,
			rateLimit,
			rateInterval,
			priceMonthly,
			features,
			reqPerMinute,
			purchaseLink,
		} = c.req.valid("json");

		const existingPlan = await db.query.plans.findFirst({
			where: eq(plans.planId, planId),
		});

		if (existingPlan) {
			return c.json({ success: false, error: "Plan ID already exists" }, 400);
		}

		const [newPlan] = await db
			.insert(plans)
			.values({
				planId,
				name,
				description: description || null,
				rateLimit,
				rateInterval,
				priceMonthly: priceMonthly || null,
				features: features || [],
				reqPerMinute: reqPerMinute || null,
				purchaseLink: purchaseLink || null,
			})
			.returning();

		return c.json({ success: true, data: newPlan });
	})
	.put("/plans/:id", zValidator("json", updatePlanSchema), async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const id = c.req.param("id");
		const {
			name,
			description,
			rateLimit,
			rateInterval,
			priceMonthly,
			features,
			reqPerMinute,
			purchaseLink,
		} = c.req.valid("json");

		const existingPlan = await db.query.plans.findFirst({
			where: eq(plans.planId, id),
		});

		if (!existingPlan) {
			return c.json({ success: false, error: "Plan not found" }, 404);
		}

		const [updatedPlan] = await db
			.update(plans)
			.set({
				name,
				description: description || null,
				rateLimit,
				rateInterval,
				priceMonthly: priceMonthly || null,
				features: features || [],
				reqPerMinute: reqPerMinute ?? null,
				purchaseLink: purchaseLink ?? null,
			})
			.where(eq(plans.planId, id))
			.returning();

		return c.json({ success: true, data: updatedPlan });
	})
	.delete("/plans/:id", async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const id = c.req.param("id");

		if (id === "free") {
			return c.json({ success: false, error: "Cannot delete the free plan" }, 400);
		}

		const existingPlan = await db.query.plans.findFirst({
			where: eq(plans.planId, id),
		});

		if (!existingPlan) {
			return c.json({ success: false, error: "Plan not found" }, 404);
		}

		const usersWithPlan = await db.query.user.findFirst({
			where: eq(user.planId, id),
		});

		if (usersWithPlan) {
			return c.json({ success: false, error: "Cannot delete plan with active users" }, 400);
		}

		await db.delete(plans).where(eq(plans.planId, id));

		return c.json({ success: true, message: "Plan deleted successfully" });
	})
	// Plan-Service management
	.get("/plans/:id/services", async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const planId = c.req.param("id");

		const planServicesList = await db.query.planServices.findMany({
			where: eq(planServices.planId, planId),
			with: {
				service: true,
			},
		});

		return c.json({
			success: true,
			data: planServicesList.map((ps) => ({
				serviceId: ps.serviceId,
				serviceName: ps.service.name,
				servicePrefix: ps.service.prefix,
				dailyLimit: ps.dailyLimit,
				monthlyLimit: ps.monthlyLimit,
			})),
		});
	})
	.post("/plans/:id/services", zValidator("json", planServiceSchema), async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const planId = c.req.param("id");
		const { serviceId, dailyLimit, monthlyLimit } = c.req.valid("json");

		const existingPlan = await db.query.plans.findFirst({
			where: eq(plans.planId, planId),
		});

		if (!existingPlan) {
			return c.json({ success: false, error: "Plan not found" }, 404);
		}

		const existingService = await db.query.services.findFirst({
			where: eq(services.id, serviceId),
		});

		if (!existingService) {
			return c.json({ success: false, error: "Service not found" }, 404);
		}

		const existing = await db.query.planServices.findFirst({
			where: and(eq(planServices.planId, planId), eq(planServices.serviceId, serviceId)),
		});

		if (existing) {
			const [updated] = await db
				.update(planServices)
				.set({
					dailyLimit: dailyLimit ?? null,
					monthlyLimit: monthlyLimit ?? null,
					updatedAt: new Date(),
				})
				.where(and(eq(planServices.planId, planId), eq(planServices.serviceId, serviceId)))
				.returning();

			return c.json({ success: true, data: updated, message: "Service limits updated" });
		}

		const [created] = await db
			.insert(planServices)
			.values({
				planId,
				serviceId,
				dailyLimit: dailyLimit ?? null,
				monthlyLimit: monthlyLimit ?? null,
			})
			.returning();

		return c.json({ success: true, data: created, message: "Service added to plan" });
	})
	.delete("/plans/:id/services/:serviceId", async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const planId = c.req.param("id");
		const serviceId = c.req.param("serviceId");

		await db
			.delete(planServices)
			.where(and(eq(planServices.planId, planId), eq(planServices.serviceId, serviceId)));

		return c.json({ success: true, message: "Service removed from plan" });
	})
	// User plan management
	.put("/users/:id/plan", zValidator("json", updateUserPlanSchema), async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const userId = c.req.param("id");
		const { planId, expiresAt } = c.req.valid("json");

		const plan = await db.query.plans.findFirst({
			where: eq(plans.planId, planId),
		});

		if (!plan) {
			return c.json({ success: false, error: "Invalid plan" }, 400);
		}

		const targetUser = await db.query.user.findFirst({
			where: eq(user.id, userId),
		});

		if (!targetUser) {
			return c.json({ success: false, error: "User not found" }, 404);
		}

		const planExpiresAt = planId === "free" ? null : expiresAt ? new Date(expiresAt) : null;

		await db.update(user).set({ planId, planExpiresAt }).where(eq(user.id, userId));

		return c.json({ success: true, message: "User plan updated" });
	})
	.post("/users/:id/renew", zValidator("json", renewPlanSchema), async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const userId = c.req.param("id");
		const { months } = c.req.valid("json");

		const targetUser = await db.query.user.findFirst({
			where: eq(user.id, userId),
		});

		if (!targetUser) {
			return c.json({ success: false, error: "User not found" }, 404);
		}

		if (targetUser.planId === "free") {
			return c.json({ success: false, error: "Cannot renew free plan" }, 400);
		}

		const baseDate =
			targetUser.planExpiresAt && targetUser.planExpiresAt > new Date()
				? targetUser.planExpiresAt
				: new Date();

		const newExpiresAt = new Date(baseDate);
		newExpiresAt.setMonth(newExpiresAt.getMonth() + months);

		await db.update(user).set({ planExpiresAt: newExpiresAt }).where(eq(user.id, userId));

		return c.json({
			success: true,
			message: `Plan renewed for ${months} month(s)`,
			expiresAt: newExpiresAt.toISOString(),
		});
	})
	// API key management
	.put("/users/:id/apikey", zValidator("json", setApiKeySchema), async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const userId = c.req.param("id");
		const { apiKey } = c.req.valid("json");

		const targetUser = await db.query.user.findFirst({
			where: eq(user.id, userId),
		});

		if (!targetUser) {
			return c.json({ success: false, error: "User not found" }, 404);
		}

		const encoder = new TextEncoder();
		const data = encoder.encode(apiKey);
		const hashBuffer = await crypto.subtle.digest("SHA-256", data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const apiKeyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

		const existingKeyUser = await db.query.user.findFirst({
			where: eq(user.apiKeyHash, apiKeyHash),
		});

		if (existingKeyUser && existingKeyUser.id !== userId) {
			return c.json(
				{ success: false, error: "This API key is already in use by another user" },
				400
			);
		}

		await db.update(user).set({ apiKey, apiKeyHash }).where(eq(user.id, userId));

		return c.json({ success: true, message: "API key updated successfully", apiKey });
	})
	.delete("/users/:id/apikey", async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const userId = c.req.param("id");

		const targetUser = await db.query.user.findFirst({
			where: eq(user.id, userId),
		});

		if (!targetUser) {
			return c.json({ success: false, error: "User not found" }, 404);
		}

		await db.update(user).set({ apiKey: null, apiKeyHash: null }).where(eq(user.id, userId));

		return c.json({ success: true, message: "API key removed successfully" });
	})
	// Services CRUD
	.get("/services", async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const allServices = await db.query.services.findMany({
			orderBy: (services, { asc }) => [asc(services.name)],
		});

		return c.json({ success: true, data: allServices });
	})
	.post("/services", zValidator("json", createServiceSchema), async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const { name, description, baseUrl, prefix, docsUrl } = c.req.valid("json");

		const serviceId = generateServiceId(name);

		const existingService = await db.query.services.findFirst({
			where: eq(services.id, serviceId),
		});

		if (existingService) {
			return c.json({ success: false, error: "Service with this name already exists" }, 400);
		}

		if (prefix) {
			const existingPrefix = await db.query.services.findFirst({
				where: eq(services.prefix, prefix),
			});

			if (existingPrefix) {
				return c.json({ success: false, error: "Prefix already in use by another service" }, 400);
			}
		}

		const [newService] = await db
			.insert(services)
			.values({
				id: serviceId,
				name,
				description: description || null,
				baseUrl,
				prefix: prefix || null,
				docsUrl: docsUrl || null,
				isActive: true,
			})
			.returning();

		return c.json({ success: true, data: newService });
	})
	.put("/services/:id", zValidator("json", updateServiceSchema), async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const id = c.req.param("id");
		const { name, description, baseUrl, prefix, docsUrl, isActive } = c.req.valid("json");

		const existingService = await db.query.services.findFirst({
			where: eq(services.id, id),
		});

		if (!existingService) {
			return c.json({ success: false, error: "Service not found" }, 404);
		}

		if (prefix && prefix !== existingService.prefix) {
			const existingPrefix = await db.query.services.findFirst({
				where: eq(services.prefix, prefix),
			});

			if (existingPrefix && existingPrefix.id !== id) {
				return c.json({ success: false, error: "Prefix already in use by another service" }, 400);
			}
		}

		const [updatedService] = await db
			.update(services)
			.set({
				name,
				description: description || null,
				baseUrl,
				prefix: prefix || null,
				docsUrl: docsUrl || null,
				isActive: isActive ?? true,
				updatedAt: new Date(),
			})
			.where(eq(services.id, id))
			.returning();

		return c.json({ success: true, data: updatedService });
	})
	.delete("/services/:id", async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const id = c.req.param("id");

		const existingService = await db.query.services.findFirst({
			where: eq(services.id, id),
		});

		if (!existingService) {
			return c.json({ success: false, error: "Service not found" }, 404);
		}

		await db.delete(services).where(eq(services.id, id));

		return c.json({ success: true, message: "Service deleted successfully" });
	})
	.get(
		"/logs",
		zValidator(
			"query",
			z.object({
				page: z.coerce.number().min(1).default(1),
				limit: z.coerce.number().min(1).max(100).default(20),
				userId: z.string().optional(),
				status: z.coerce.number().optional(),
				startDate: z.string().optional(),
				endDate: z.string().optional(),
				search: z.string().optional(),
			})
		),
		async (c) => {
			const session = await getSessionFromRequest(c.req.raw);
			if (!session?.user) {
				return c.json({ success: false, error: "Unauthorized" }, 401);
			}
			if (session.user.role !== "admin") {
				return c.json({ success: false, error: "Forbidden" }, 403);
			}

			const { page, limit, userId, status, startDate, endDate, search } = c.req.valid("query");
			const offset = (page - 1) * limit;

			const conditions = [];
			if (userId) {
				conditions.push(eq(requestLogs.userId, userId));
			}
			if (status) {
				conditions.push(eq(requestLogs.statusCode, status));
			}
			if (startDate) {
				conditions.push(gte(requestLogs.timestamp, new Date(startDate)));
			}
			if (endDate) {
				conditions.push(lte(requestLogs.timestamp, new Date(endDate)));
			}
			if (search) {
				conditions.push(like(requestLogs.endpoint, `%${search}%`));
			}

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			const logs = await db
				.select({
					logId: requestLogs.logId,
					userId: requestLogs.userId,
					timestamp: requestLogs.timestamp,
					endpoint: requestLogs.endpoint,
					method: requestLogs.method,
					statusCode: requestLogs.statusCode,
					latencyMs: requestLogs.latencyMs,
					ipAddress: requestLogs.ipAddress,
					userName: user.name,
					userEmail: user.email,
				})
				.from(requestLogs)
				.leftJoin(user, eq(requestLogs.userId, user.id))
				.where(whereClause)
				.orderBy(desc(requestLogs.timestamp))
				.limit(limit)
				.offset(offset);

			const [countResult] = await db
				.select({ count: count() })
				.from(requestLogs)
				.where(whereClause);

			const total = Number(countResult?.count) || 0;
			const totalPages = Math.ceil(total / limit);

			return c.json({
				success: true,
				data: {
					logs: logs.map((log) => ({
						id: log.logId,
						userId: log.userId,
						userName: log.userName || "Unknown",
						userEmail: log.userEmail || "",
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
	.get("/logs/stats", async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		const [todayResult] = await db
			.select({ count: count() })
			.from(requestLogs)
			.where(gte(requestLogs.timestamp, todayStart));

		const byUser = await db
			.select({
				userId: requestLogs.userId,
				userName: user.name,
				userEmail: user.email,
				count: count(),
			})
			.from(requestLogs)
			.leftJoin(user, eq(requestLogs.userId, user.id))
			.where(gte(requestLogs.timestamp, todayStart))
			.groupBy(requestLogs.userId, user.name, user.email)
			.orderBy(desc(count()))
			.limit(10);

		const byEndpoint = await db
			.select({
				endpoint: requestLogs.endpoint,
				count: count(),
			})
			.from(requestLogs)
			.where(gte(requestLogs.timestamp, todayStart))
			.groupBy(requestLogs.endpoint)
			.orderBy(desc(count()))
			.limit(10);

		const byStatus = await db
			.select({
				statusCode: requestLogs.statusCode,
				count: count(),
			})
			.from(requestLogs)
			.where(gte(requestLogs.timestamp, todayStart))
			.groupBy(requestLogs.statusCode)
			.orderBy(desc(count()));

		return c.json({
			success: true,
			data: {
				totalToday: Number(todayResult?.count) || 0,
				byUser: byUser.map((u) => ({
					userId: u.userId,
					userName: u.userName || "Unknown",
					userEmail: u.userEmail || "",
					count: Number(u.count),
				})),
				byEndpoint: byEndpoint.map((e) => ({
					endpoint: e.endpoint,
					count: Number(e.count),
				})),
				byStatus: byStatus.map((s) => ({
					statusCode: s.statusCode,
					count: Number(s.count),
				})),
			},
		});
	})
	.get("/logs/:id", async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const logId = c.req.param("id");

		const [log] = await db
			.select({
				logId: requestLogs.logId,
				userId: requestLogs.userId,
				timestamp: requestLogs.timestamp,
				endpoint: requestLogs.endpoint,
				method: requestLogs.method,
				statusCode: requestLogs.statusCode,
				latencyMs: requestLogs.latencyMs,
				ipAddress: requestLogs.ipAddress,
				queryParams: requestLogs.queryParams,
				requestHeaders: requestLogs.requestHeaders,
				requestBody: requestLogs.requestBody,
				responseHeaders: requestLogs.responseHeaders,
				responseBody: requestLogs.responseBody,
				userName: user.name,
				userEmail: user.email,
			})
			.from(requestLogs)
			.leftJoin(user, eq(requestLogs.userId, user.id))
			.where(eq(requestLogs.logId, logId));

		if (!log) {
			return c.json({ success: false, error: "Log not found" }, 404);
		}

		return c.json({
			success: true,
			data: {
				id: log.logId,
				userId: log.userId,
				userName: log.userName || "Unknown",
				userEmail: log.userEmail || "",
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
	// Site Settings CRUD
	.get("/settings", async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const allSettings = await db.query.siteSettings.findMany({
			orderBy: [asc(siteSettings.key)],
		});

		return c.json({ success: true, data: allSettings });
	})
	.get("/settings/:key", async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const key = c.req.param("key");
		const setting = await db.query.siteSettings.findFirst({
			where: eq(siteSettings.key, key),
		});

		if (!setting) {
			return c.json({ success: false, error: "Setting not found" }, 404);
		}

		return c.json({ success: true, data: setting });
	})
	.put(
		"/settings/:key",
		zValidator(
			"json",
			z.object({
				value: z.string().nullable(),
			})
		),
		async (c) => {
			const session = await getSessionFromRequest(c.req.raw);
			if (!session?.user) {
				return c.json({ success: false, error: "Unauthorized" }, 401);
			}
			if (session.user.role !== "admin") {
				return c.json({ success: false, error: "Forbidden" }, 403);
			}

			const key = c.req.param("key");
			const { value } = c.req.valid("json");

			const existing = await db.query.siteSettings.findFirst({
				where: eq(siteSettings.key, key),
			});

			if (existing) {
				const [updated] = await db
					.update(siteSettings)
					.set({ value, updatedAt: new Date() })
					.where(eq(siteSettings.key, key))
					.returning();

				return c.json({ success: true, data: updated });
			}

			const [created] = await db
				.insert(siteSettings)
				.values({ key, value, updatedAt: new Date() })
				.returning();

			return c.json({ success: true, data: created });
		}
	)
	.post(
		"/settings",
		zValidator(
			"json",
			z.object({
				key: z.string().min(1).max(100),
				value: z.string().nullable(),
			})
		),
		async (c) => {
			const session = await getSessionFromRequest(c.req.raw);
			if (!session?.user) {
				return c.json({ success: false, error: "Unauthorized" }, 401);
			}
			if (session.user.role !== "admin") {
				return c.json({ success: false, error: "Forbidden" }, 403);
			}

			const { key, value } = c.req.valid("json");

			const existing = await db.query.siteSettings.findFirst({
				where: eq(siteSettings.key, key),
			});

			if (existing) {
				return c.json({ success: false, error: "Setting already exists" }, 400);
			}

			const [created] = await db
				.insert(siteSettings)
				.values({ key, value, updatedAt: new Date() })
				.returning();

			return c.json({ success: true, data: created });
		}
	)
	.delete("/settings/:key", async (c) => {
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const key = c.req.param("key");

		const existing = await db.query.siteSettings.findFirst({
			where: eq(siteSettings.key, key),
		});

		if (!existing) {
			return c.json({ success: false, error: "Setting not found" }, 404);
		}

		await db.delete(siteSettings).where(eq(siteSettings.key, key));

		return c.json({ success: true, message: "Setting deleted successfully" });
	})
	// Log Summaries (Archives)
	.get(
		"/log-summaries",
		zValidator(
			"query",
			z.object({
				page: z.coerce.number().min(1).default(1),
				limit: z.coerce.number().min(1).max(100).default(20),
				userId: z.string().optional(),
				startDate: z.string().optional(),
				endDate: z.string().optional(),
			})
		),
		async (c) => {
			const session = await getSessionFromRequest(c.req.raw);
			if (!session?.user) {
				return c.json({ success: false, error: "Unauthorized" }, 401);
			}
			if (session.user.role !== "admin") {
				return c.json({ success: false, error: "Forbidden" }, 403);
			}

			const { page, limit, userId, startDate, endDate } = c.req.valid("query");
			const offset = (page - 1) * limit;

			const conditions = [];
			if (userId) {
				conditions.push(eq(logSummaries.userId, userId));
			}
			if (startDate) {
				conditions.push(gte(logSummaries.date, startDate));
			}
			if (endDate) {
				conditions.push(lte(logSummaries.date, endDate));
			}

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			const summaries = await db
				.select({
					summaryId: logSummaries.summaryId,
					userId: logSummaries.userId,
					date: logSummaries.date,
					totalRequests: logSummaries.totalRequests,
					successfulRequests: logSummaries.successfulRequests,
					failedRequests: logSummaries.failedRequests,
					averageLatencyMs: logSummaries.averageLatencyMs,
					endpointUsage: logSummaries.endpointUsage,
					lastUpdated: logSummaries.lastUpdated,
					userName: user.name,
					userEmail: user.email,
				})
				.from(logSummaries)
				.leftJoin(user, eq(logSummaries.userId, user.id))
				.where(whereClause)
				.orderBy(desc(logSummaries.date), desc(logSummaries.lastUpdated))
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
						userId: s.userId,
						userName: s.userName || "Unknown",
						userEmail: s.userEmail || "",
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
		const session = await getSessionFromRequest(c.req.raw);
		if (!session?.user) {
			return c.json({ success: false, error: "Unauthorized" }, 401);
		}
		if (session.user.role !== "admin") {
			return c.json({ success: false, error: "Forbidden" }, 403);
		}

		const summaryId = c.req.param("id");

		const [summary] = await db
			.select({
				summaryId: logSummaries.summaryId,
				userId: logSummaries.userId,
				date: logSummaries.date,
				totalRequests: logSummaries.totalRequests,
				successfulRequests: logSummaries.successfulRequests,
				failedRequests: logSummaries.failedRequests,
				averageLatencyMs: logSummaries.averageLatencyMs,
				endpointUsage: logSummaries.endpointUsage,
				lastUpdated: logSummaries.lastUpdated,
				userName: user.name,
				userEmail: user.email,
			})
			.from(logSummaries)
			.leftJoin(user, eq(logSummaries.userId, user.id))
			.where(eq(logSummaries.summaryId, summaryId));

		if (!summary) {
			return c.json({ success: false, error: "Summary not found" }, 404);
		}

		return c.json({
			success: true,
			data: {
				id: summary.summaryId,
				userId: summary.userId,
				userName: summary.userName || "Unknown",
				userEmail: summary.userEmail || "",
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
