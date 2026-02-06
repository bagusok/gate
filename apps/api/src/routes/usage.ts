import { redis } from "@gate/database/redis";
import { Hono } from "hono";
import { type AuthVariables, authMiddleware } from "../middleware/auth";

const usage = new Hono<{ Variables: AuthVariables }>();

usage.use("/*", authMiddleware);

usage.get("/usage", async (c) => {
	const userData = c.get("userData");

	const plan = userData.plan!;
	const limit = plan.rateLimit;
	const interval = plan.rateInterval;

	let redisKey: string;
	const now = new Date();
	let resetTimestamp: string;

	if (interval === "daily") {
		const dateStr = now.toISOString().split("T")[0];
		redisKey = `ratelimit:${userData.id}:${dateStr}`;
		const endOfDay = new Date(dateStr);
		endOfDay.setUTCHours(23, 59, 59, 999);
		resetTimestamp = endOfDay.toISOString();
	} else if (interval === "hourly") {
		const hourStr = now.toISOString().substring(0, 13);
		redisKey = `ratelimit:${userData.id}:${hourStr}`;
		const endOfHour = new Date(now);
		endOfHour.setUTCMinutes(59, 59, 999);
		resetTimestamp = endOfHour.toISOString();
	} else {
		return c.json(
			{
				status: false,
				message: "Unsupported rate interval",
				code: 500,
				error: "INVALID_RATE_INTERVAL",
			},
			500
		);
	}

	const currentUsageStr = await redis.get(redisKey);
	const currentUsage = parseInt(currentUsageStr || "0", 10);
	const remaining = Math.max(0, limit - currentUsage);

	return c.json({
		status: true,
		data: {
			plan: {
				name: plan.name,
				limit: limit,
				interval: interval,
				expiredAt: userData.planExpiresAt,
			},
			usage: {
				used: currentUsage,
				remaining: remaining,
				resetAt: resetTimestamp,
			},
		},
	});
});

export { usage as usageRoutes };
