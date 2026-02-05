import { and, db, eq, type InferSelectModel, planServices, plans, user } from "@gate/database";
import { redis } from "@gate/database/redis";
import type { Context, Next } from "hono";

export type UserWithPlan = InferSelectModel<typeof user> & {
	plan: InferSelectModel<typeof plans> | null;
};

export type AuthVariables = {
	userData: UserWithPlan;
	startTime: number;
};

export type RateLimitVariables = AuthVariables & {
	rateLimit: {
		limit: number;
		remaining: number;
		used: number;
		reset: number;
	};
};

export type ServiceRateLimitInfo = {
	serviceId: string;
	serviceName: string;
	dailyLimit: number | null;
	dailyUsed: number;
	dailyRemaining: number | null;
	monthlyLimit: number | null;
	monthlyUsed: number;
	monthlyRemaining: number | null;
};

async function hashApiKey(apiKey: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(apiKey);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function downgradeToFreePlan(userId: string): Promise<void> {
	await db.update(user).set({ planId: "free", planExpiresAt: null }).where(eq(user.id, userId));
}

function errorResponse(c: Context, code: number, message: string, error: string) {
	return c.json(
		{
			status: false,
			message,
			code,
			error,
		},
		code as any
	);
}

function getApiKeyHeader(c: Context): string | undefined {
	return c.req.header("X-API-Key") || c.req.header("x-api-key") || c.req.header("X-API-KEY");
}

export async function authMiddleware(c: Context, next: Next) {
	const startTime = Date.now();

	const apiKey = getApiKeyHeader(c);
	if (!apiKey) {
		return errorResponse(c, 401, "API Key is required", "MISSING_API_KEY");
	}

	const hashedKey = await hashApiKey(apiKey);

	let userData = await db.query.user.findFirst({
		where: eq(user.apiKeyHash, hashedKey),
		with: {
			plan: true,
		},
	});

	if (!userData) {
		return errorResponse(c, 401, "Invalid API Key", "INVALID_API_KEY");
	}

	if (userData.planId !== "free" && userData.planExpiresAt) {
		const now = new Date();
		if (userData.planExpiresAt < now) {
			await downgradeToFreePlan(userData.id);

			const freePlan = await db.query.plans.findFirst({
				where: eq(plans.planId, "free"),
			});

			userData = {
				...userData,
				planId: "free",
				planExpiresAt: null,
				plan: freePlan || null,
			};
		}
	}

	if (!userData.plan) {
		return errorResponse(c, 403, "No plan assigned to this account", "NO_PLAN");
	}

	c.set("userData", userData as UserWithPlan);
	c.set("startTime", startTime);

	await next();
}

async function checkAntiSpamLimits(
	userId: string,
	plan: InferSelectModel<typeof plans>
): Promise<{ exceeded: boolean; limit?: number; retryAfter?: number }> {
	if (!plan.reqPerMinute || plan.reqPerMinute <= 0) {
		return { exceeded: false };
	}

	const now = Date.now();
	const minuteKey = `antispam:min:${userId}:${Math.floor(now / 60000)}`;
	const pipeline = redis.multi();
	pipeline.incr(minuteKey);
	pipeline.expire(minuteKey, 120);
	const results = await pipeline.exec();
	const count = (results?.[0]?.[1] as number) || 0;

	if (count > plan.reqPerMinute) {
		const secondsUntilNextMinute = 60 - Math.floor((now % 60000) / 1000);
		return { exceeded: true, limit: plan.reqPerMinute, retryAfter: secondsUntilNextMinute };
	}

	return { exceeded: false };
}

export async function checkServiceRateLimits(
	userId: string,
	planId: string,
	serviceId: string,
	serviceName: string
): Promise<{ exceeded: boolean; type?: "daily" | "monthly"; info: ServiceRateLimitInfo }> {
	const now = new Date();
	const dateStr = now.toISOString().split("T")[0];
	const monthStr = now.toISOString().substring(0, 7);

	const planService = await db.query.planServices.findFirst({
		where: and(eq(planServices.planId, planId), eq(planServices.serviceId, serviceId)),
	});

	const dailyLimit = planService?.dailyLimit ?? null;
	const monthlyLimit = planService?.monthlyLimit ?? null;

	const dailyKey = `svc:daily:${userId}:${serviceId}:${dateStr}`;
	const monthlyKey = `svc:monthly:${userId}:${serviceId}:${monthStr}`;

	const [dailyUsedStr, monthlyUsedStr] = await Promise.all([
		redis.get(dailyKey),
		redis.get(monthlyKey),
	]);

	const dailyUsed = Number.parseInt(dailyUsedStr || "0", 10);
	const monthlyUsed = Number.parseInt(monthlyUsedStr || "0", 10);

	const info: ServiceRateLimitInfo = {
		serviceId,
		serviceName,
		dailyLimit,
		dailyUsed,
		dailyRemaining: dailyLimit !== null ? Math.max(0, dailyLimit - dailyUsed) : null,
		monthlyLimit,
		monthlyUsed,
		monthlyRemaining: monthlyLimit !== null ? Math.max(0, monthlyLimit - monthlyUsed) : null,
	};

	if (dailyLimit !== null && dailyUsed >= dailyLimit) {
		return { exceeded: true, type: "daily", info };
	}

	if (monthlyLimit !== null && monthlyUsed >= monthlyLimit) {
		return { exceeded: true, type: "monthly", info };
	}

	return { exceeded: false, info };
}

export async function incrementServiceUsage(userId: string, serviceId: string): Promise<void> {
	const now = new Date();
	const dateStr = now.toISOString().split("T")[0];
	const monthStr = now.toISOString().substring(0, 7);

	const dailyKey = `svc:daily:${userId}:${serviceId}:${dateStr}`;
	const monthlyKey = `svc:monthly:${userId}:${serviceId}:${monthStr}`;

	const TWO_DAYS_TTL = 86400 * 2;
	const THIRTY_FIVE_DAYS_TTL = 86400 * 35;

	const pipeline = redis.multi();
	pipeline.incr(dailyKey);
	pipeline.expire(dailyKey, TWO_DAYS_TTL);
	pipeline.incr(monthlyKey);
	pipeline.expire(monthlyKey, THIRTY_FIVE_DAYS_TTL);
	await pipeline.exec();
}

export async function rateLimitMiddleware(c: Context, next: Next) {
	const startTime = Date.now();

	const apiKey = getApiKeyHeader(c);
	if (!apiKey) {
		return errorResponse(c, 401, "API Key is required", "MISSING_API_KEY");
	}

	const hashedKey = await hashApiKey(apiKey);

	let userData = await db.query.user.findFirst({
		where: eq(user.apiKeyHash, hashedKey),
		with: {
			plan: true,
		},
	});

	if (!userData) {
		return errorResponse(c, 401, "Invalid API Key", "INVALID_API_KEY");
	}

	if (userData.planId !== "free" && userData.planExpiresAt) {
		const now = new Date();
		if (userData.planExpiresAt < now) {
			await downgradeToFreePlan(userData.id);

			const freePlan = await db.query.plans.findFirst({
				where: eq(plans.planId, "free"),
			});

			userData = {
				...userData,
				planId: "free",
				planExpiresAt: null,
				plan: freePlan || null,
			};
		}
	}

	if (!userData.plan) {
		return errorResponse(c, 403, "No plan assigned to this account", "NO_PLAN");
	}

	const plan = userData.plan;

	const antiSpamResult = await checkAntiSpamLimits(userData.id, plan);
	if (antiSpamResult.exceeded) {
		c.header("Retry-After", (antiSpamResult.retryAfter ?? 1).toString());
		return errorResponse(
			c,
			429,
			`Anti-spam limit exceeded (${antiSpamResult.limit} req/minute)`,
			"ANTI_SPAM_LIMIT_EXCEEDED"
		);
	}

	const interval = plan.rateInterval;
	const limit = plan.rateLimit;

	let redisKey: string;
	let expirySeconds: number;
	let resetTimestamp: number;
	const now = new Date();

	if (interval === "daily") {
		const dateStr = now.toISOString().split("T")[0];
		redisKey = `ratelimit:${userData.id}:${dateStr}`;
		expirySeconds = 86400;
		const tomorrow = new Date(now);
		tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
		tomorrow.setUTCHours(0, 0, 0, 0);
		resetTimestamp = Math.floor(tomorrow.getTime() / 1000);
	} else if (interval === "hourly") {
		const hourStr = now.toISOString().substring(0, 13);
		redisKey = `ratelimit:${userData.id}:${hourStr}`;
		expirySeconds = 3600;
		const nextHour = new Date(now);
		nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
		resetTimestamp = Math.floor(nextHour.getTime() / 1000);
	} else {
		return errorResponse(c, 500, "Unsupported rate interval", "INVALID_RATE_INTERVAL");
	}

	const pipeline = redis.multi();
	pipeline.incr(redisKey);
	pipeline.expire(redisKey, expirySeconds);
	const results = await pipeline.exec();

	const currentCount = (results?.[0]?.[1] as number) || 0;

	if (currentCount > limit) {
		c.header("X-RateLimit-Limit", limit.toString());
		c.header("X-RateLimit-Remaining", "0");
		c.header("X-RateLimit-Used", limit.toString());
		c.header("X-RateLimit-Reset", resetTimestamp.toString());
		return errorResponse(c, 429, "Rate limit exceeded", "RATE_LIMIT_EXCEEDED");
	}

	c.set("userData", userData as UserWithPlan);
	c.set("startTime", startTime);
	c.set("rateLimit", {
		limit,
		remaining: Math.max(0, limit - currentCount),
		used: currentCount,
		reset: resetTimestamp,
	});

	await next();
}
