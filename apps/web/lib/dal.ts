import "server-only";

import { auth } from "@gate/auth";
import {
	and,
	avg,
	count,
	db,
	desc,
	eq,
	plans,
	requestLogs,
	services,
	sql,
	user,
} from "@gate/database";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export const getSession = cache(async () => {
	const headersList = await headers();
	const session = await auth.api.getSession({
		headers: headersList,
	});
	return session;
});

export const verifySession = cache(async () => {
	const session = await getSession();
	if (!session?.user) {
		redirect("/login");
	}
	return session;
});

export const getUser = cache(async () => {
	const session = await verifySession();

	const userData = await db.query.user.findFirst({
		where: eq(user.id, session.user.id),
		with: {
			plan: true,
		},
	});

	return userData;
});

export async function getUserWithApiKey(userId: string) {
	const userData = await db.query.user.findFirst({
		where: eq(user.id, userId),
		with: {
			plan: true,
		},
	});

	if (!userData) return null;

	return {
		id: userData.id,
		name: userData.name,
		email: userData.email,
		apiKey: userData.apiKey,
		plan: userData.plan,
	};
}

export async function getUserSubscription(userId: string) {
	const userData = await db.query.user.findFirst({
		where: eq(user.id, userId),
		with: {
			plan: true,
		},
	});

	if (!userData) return null;

	return {
		planId: userData.planId,
		planExpiresAt: userData.planExpiresAt,
		plan: userData.plan,
	};
}

export async function getDashboardStats(userId: string) {
	const now = new Date();
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

	const userData = await db.query.user.findFirst({
		where: eq(user.id, userId),
		columns: { apiKey: true },
	});
	const hasApiKey = !!userData?.apiKey;

	const [totalRequestsResult] = await db
		.select({ count: count() })
		.from(requestLogs)
		.where(and(eq(requestLogs.userId, userId), sql`${requestLogs.timestamp} >= ${thirtyDaysAgo}`));

	const [avgLatencyResult] = await db
		.select({ avg: avg(requestLogs.latencyMs) })
		.from(requestLogs)
		.where(
			and(
				eq(requestLogs.userId, userId),
				sql`${requestLogs.timestamp} >= ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}`
			)
		);

	const [successCountResult] = await db
		.select({ count: count() })
		.from(requestLogs)
		.where(
			and(
				eq(requestLogs.userId, userId),
				sql`${requestLogs.timestamp} >= ${sevenDaysAgo}`,
				sql`${requestLogs.statusCode} >= 200 AND ${requestLogs.statusCode} < 300`
			)
		);

	const [totalCountResult] = await db
		.select({ count: count() })
		.from(requestLogs)
		.where(and(eq(requestLogs.userId, userId), sql`${requestLogs.timestamp} >= ${sevenDaysAgo}`));

	const chartData = await db
		.select({
			date: sql<string>`DATE(${requestLogs.timestamp})`,
			requests: count(),
			successful: sql<number>`COUNT(*) FILTER (WHERE ${requestLogs.statusCode} >= 200 AND ${requestLogs.statusCode} < 300)`,
			failed: sql<number>`COUNT(*) FILTER (WHERE ${requestLogs.statusCode} >= 400)`,
		})
		.from(requestLogs)
		.where(and(eq(requestLogs.userId, userId), sql`${requestLogs.timestamp} >= ${sevenDaysAgo}`))
		.groupBy(sql`DATE(${requestLogs.timestamp})`)
		.orderBy(sql`DATE(${requestLogs.timestamp})`);

	const totalCount = totalCountResult?.count || 0;
	const successCount = successCountResult?.count || 0;
	const successRate = totalCount > 0 ? (Number(successCount) / Number(totalCount)) * 100 : 100;

	return {
		totalRequests: totalRequestsResult?.count || 0,
		hasApiKey,
		avgResponseTime: Math.round(Number(avgLatencyResult?.avg) || 0),
		successRate: Math.round(successRate * 10) / 10,
		chartData,
	};
}

export async function getRequestLogs(userId: string, limit = 100) {
	const logs = await db.query.requestLogs.findMany({
		where: eq(requestLogs.userId, userId),
		orderBy: [desc(requestLogs.timestamp)],
		limit,
	});

	return logs.map((log) => ({
		id: log.logId,
		endpoint: log.endpoint,
		method: log.method,
		statusCode: log.statusCode,
		latencyMs: log.latencyMs,
		timestamp: log.timestamp?.toISOString() || "",
		ipAddress: log.ipAddress || "",
	}));
}

export async function getAllPlans() {
	const allPlans = await db.query.plans.findMany({
		orderBy: [plans.priceMonthly],
	});

	return allPlans;
}

export const verifyAdminSession = cache(async () => {
	const session = await verifySession();
	if (session.user.role !== "admin") {
		redirect("/dashboard");
	}
	return session;
});

export async function getPlansWithUserCount() {
	const allPlans = await db.query.plans.findMany({
		orderBy: [plans.priceMonthly],
	});

	const plansWithCount = await Promise.all(
		allPlans.map(async (plan) => {
			const [result] = await db
				.select({ count: count() })
				.from(user)
				.where(eq(user.planId, plan.planId));

			return {
				planId: plan.planId,
				name: plan.name,
				description: plan.description,
				rateLimit: plan.rateLimit,
				rateInterval: plan.rateInterval,
				priceMonthly: plan.priceMonthly,
				features: plan.features || [],
				usersCount: Number(result?.count) || 0,
			};
		})
	);

	return plansWithCount;
}

export async function getAllUsersWithPlans() {
	const allUsers = await db.query.user.findMany({
		orderBy: [desc(user.createdAt)],
		with: {
			plan: true,
		},
	});

	return allUsers.map((u) => ({
		id: u.id,
		name: u.name,
		email: u.email,
		role: u.role as "user" | "admin",
		status: "active" as const,
		planId: u.planId,
		planName: u.plan?.name || "No Plan",
		planExpiresAt: u.planExpiresAt?.toISOString() || null,
		createdAt: u.createdAt?.toISOString().split("T")[0] || "",
		apiKey: u.apiKey,
	}));
}

export async function getAdminDashboardStats() {
	const now = new Date();
	const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

	const [totalRequestsResult] = await db.select({ count: count() }).from(requestLogs);

	const [totalUsersResult] = await db.select({ count: count() }).from(user);

	const [usersWithApiKeyResult] = await db
		.select({ count: count() })
		.from(user)
		.where(sql`${user.apiKey} IS NOT NULL`);

	const [totalPlansResult] = await db.select({ count: count() }).from(plans);

	const chartData = await db
		.select({
			date: sql<string>`DATE(${requestLogs.timestamp})`,
			requests: count(),
			successful: sql<number>`COUNT(*) FILTER (WHERE ${requestLogs.statusCode} >= 200 AND ${requestLogs.statusCode} < 300)`,
			failed: sql<number>`COUNT(*) FILTER (WHERE ${requestLogs.statusCode} >= 400)`,
		})
		.from(requestLogs)
		.where(sql`${requestLogs.timestamp} >= ${sevenDaysAgo}`)
		.groupBy(sql`DATE(${requestLogs.timestamp})`)
		.orderBy(sql`DATE(${requestLogs.timestamp})`);

	return {
		totalRequests: Number(totalRequestsResult?.count) || 0,
		totalUsers: Number(totalUsersResult?.count) || 0,
		usersWithApiKey: Number(usersWithApiKeyResult?.count) || 0,
		totalPlans: Number(totalPlansResult?.count) || 0,
		chartData,
	};
}

export async function getAllServices() {
	const allServices = await db.query.services.findMany({
		orderBy: [services.name],
	});

	return allServices.map((s) => ({
		id: s.id,
		name: s.name,
		description: s.description,
		baseUrl: s.baseUrl,
		prefix: s.prefix,
		docsUrl: s.docsUrl,
		isActive: s.isActive,
		createdAt: s.createdAt?.toISOString() || "",
		updatedAt: s.updatedAt?.toISOString() || "",
	}));
}
