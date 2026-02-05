import { db, eq, isNull, requestLogs, services } from "@gate/database";
import { Hono } from "hono";
import {
	checkServiceRateLimits,
	incrementServiceUsage,
	type RateLimitVariables,
	rateLimitMiddleware,
} from "../middleware/auth";

const proxy = new Hono<{ Variables: RateLimitVariables }>();

proxy.use("/*", rateLimitMiddleware);

async function findServiceByPrefix(prefix: string | null) {
	if (prefix) {
		const service = await db.query.services.findFirst({
			where: eq(services.prefix, prefix),
		});
		if (service?.isActive) {
			return service;
		}
	}

	const defaultService = await db.query.services.findFirst({
		where: isNull(services.prefix),
	});
	if (defaultService?.isActive) {
		return defaultService;
	}

	const anyActiveService = await db.query.services.findFirst({
		where: eq(services.isActive, true),
	});
	return anyActiveService;
}

interface LogData {
	userId: string;
	endpoint: string;
	method: string;
	statusCode: number;
	latencyMs: number;
	ipAddress: string | null;
	queryParams?: Record<string, string>;
	requestHeaders?: Record<string, string>;
	responseHeaders?: Record<string, string>;
	responseBody?: string;
}

function logRequestAsync(data: LogData) {
	(async () => {
		try {
			await db.insert(requestLogs).values({
				userId: data.userId,
				endpoint: data.endpoint,
				method: data.method,
				statusCode: data.statusCode,
				latencyMs: data.latencyMs,
				queryParams: data.queryParams || {},
				requestHeaders: data.requestHeaders || {},
				responseHeaders: data.responseHeaders || {},
				responseBody: data.responseBody?.substring(0, 5000) || null,
				ipAddress: data.ipAddress,
			});
		} catch (err) {
			console.error("Failed to write request log:", err);
		}
	})();
}

proxy.all("/*", async (c) => {
	const userData = c.get("userData");
	const startTime = c.get("startTime");
	const rateLimit = c.get("rateLimit");

	const req = c.req.raw;
	const incomingUrl = new URL(req.url);
	const pathAfterProxy = incomingUrl.pathname.replace(/^\/proxy\/?/, "");
	const pathSegments = pathAfterProxy.split("/").filter((s) => s.length > 0);

	const requestHeaders: Record<string, string> = {};
	req.headers.forEach((value, key) => {
		requestHeaders[key] = value;
	});

	const queryParams: Record<string, string> = {};
	incomingUrl.searchParams.forEach((value, key) => {
		queryParams[key] = value;
	});

	const potentialPrefix = pathSegments[0] || null;
	let service = await findServiceByPrefix(potentialPrefix);
	let remainingPath: string[];

	if (service && service.prefix === potentialPrefix) {
		remainingPath = pathSegments.slice(1);
	} else {
		service = await findServiceByPrefix(null);
		remainingPath = pathSegments;
	}

	if (!service) {
		const latencyMs = Date.now() - startTime;
		const responseBody = JSON.stringify({
			status: false,
			message: "No service configured for this route",
			code: 404,
			error: "SERVICE_NOT_FOUND",
		});

		logRequestAsync({
			userId: userData.id,
			endpoint: incomingUrl.pathname,
			method: req.method,
			statusCode: 404,
			latencyMs,
			ipAddress: req.headers.get("x-forwarded-for") || null,
			queryParams,
			requestHeaders,
			responseBody,
		});

		return c.json(
			{
				status: false,
				message: "No service configured for this route",
				code: 404,
				error: "SERVICE_NOT_FOUND",
			},
			404
		);
	}

	if (!service.isActive) {
		const latencyMs = Date.now() - startTime;
		const responseBody = JSON.stringify({
			status: false,
			message: "Service is temporarily unavailable",
			code: 503,
			error: "SERVICE_UNAVAILABLE",
		});

		logRequestAsync({
			userId: userData.id,
			endpoint: incomingUrl.pathname,
			method: req.method,
			statusCode: 503,
			latencyMs,
			ipAddress: req.headers.get("x-forwarded-for") || null,
			queryParams,
			requestHeaders,
			responseBody,
		});

		return c.json(
			{
				status: false,
				message: "Service is temporarily unavailable",
				code: 503,
				error: "SERVICE_UNAVAILABLE",
			},
			503
		);
	}

	const serviceRateLimitResult = await checkServiceRateLimits(
		userData.id,
		userData.planId || "free",
		service.id,
		service.name
	);

	if (serviceRateLimitResult.exceeded) {
		const latencyMs = Date.now() - startTime;
		const limitType = serviceRateLimitResult.type === "daily" ? "daily" : "monthly";
		const limitInfo = serviceRateLimitResult.info;
		const limitValue = limitType === "daily" ? limitInfo.dailyLimit : limitInfo.monthlyLimit;

		const responseBody = JSON.stringify({
			status: false,
			message: `Service ${limitType} limit exceeded for ${service.name} (${limitValue} requests/${limitType})`,
			code: 429,
			error: "SERVICE_LIMIT_EXCEEDED",
			service: service.name,
			limitType,
		});

		logRequestAsync({
			userId: userData.id,
			endpoint: incomingUrl.pathname,
			method: req.method,
			statusCode: 429,
			latencyMs,
			ipAddress: req.headers.get("x-forwarded-for") || null,
			queryParams,
			requestHeaders,
			responseBody,
		});

		return c.json(
			{
				status: false,
				message: `Service ${limitType} limit exceeded for ${service.name} (${limitValue} requests/${limitType})`,
				code: 429,
				error: "SERVICE_LIMIT_EXCEEDED",
				service: service.name,
				limitType,
			},
			429
		);
	}

	const serviceRateLimitInfo = serviceRateLimitResult.info;

	const upstreamBase = new URL(service.baseUrl);
	const baseSegments = upstreamBase.pathname.split("/").filter((segment) => segment.length > 0);
	const finalSegments = [...baseSegments, ...remainingPath];

	upstreamBase.pathname = finalSegments.length ? `/${finalSegments.join("/")}` : "/";
	upstreamBase.search = incomingUrl.search;

	const isBodylessMethod = req.method === "GET" || req.method === "HEAD";
	let requestBody: ArrayBuffer | undefined;
	if (!isBodylessMethod) {
		requestBody = await req.arrayBuffer();
	}

	const forwardedHeaders = new Headers(req.headers);
	forwardedHeaders.set("host", upstreamBase.host);
	forwardedHeaders.delete("X-API-Key");

	console.log(`[${service.name}] Proxying request to:`, upstreamBase.toString());

	let upstreamResponse: Response;
	try {
		upstreamResponse = await fetch(upstreamBase.toString(), {
			method: req.method,
			headers: forwardedHeaders,
			body: requestBody,
		});
	} catch (err) {
		console.error("Upstream request failed:", err);
		const latencyMs = Date.now() - startTime;
		const responseBody = JSON.stringify({
			status: false,
			message: "Failed to connect to upstream service",
			code: 502,
			error: "UPSTREAM_ERROR",
		});

		logRequestAsync({
			userId: userData.id,
			endpoint: incomingUrl.pathname,
			method: req.method,
			statusCode: 502,
			latencyMs,
			ipAddress: req.headers.get("x-forwarded-for") || null,
			queryParams,
			requestHeaders,
			responseBody,
		});

		return c.json(
			{
				status: false,
				message: "Failed to connect to upstream service",
				code: 502,
				error: "UPSTREAM_ERROR",
			},
			502
		);
	}

	const latencyMs = Date.now() - startTime;
	const responseBuffer = await upstreamResponse.arrayBuffer();

	const responseHeaders = new Headers(upstreamResponse.headers);
	responseHeaders.set("X-RateLimit-Limit", rateLimit.limit.toString());
	responseHeaders.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
	responseHeaders.set("X-RateLimit-Used", rateLimit.used.toString());
	responseHeaders.set("X-RateLimit-Reset", rateLimit.reset.toString());
	responseHeaders.set("X-Service", service.name);

	if (serviceRateLimitInfo.dailyLimit !== null) {
		responseHeaders.set("X-Service-DailyLimit", serviceRateLimitInfo.dailyLimit.toString());
		responseHeaders.set("X-Service-DailyUsed", (serviceRateLimitInfo.dailyUsed + 1).toString());
		responseHeaders.set(
			"X-Service-DailyRemaining",
			Math.max(0, serviceRateLimitInfo.dailyLimit - serviceRateLimitInfo.dailyUsed - 1).toString()
		);
	}
	if (serviceRateLimitInfo.monthlyLimit !== null) {
		responseHeaders.set("X-Service-MonthlyLimit", serviceRateLimitInfo.monthlyLimit.toString());
		responseHeaders.set("X-Service-MonthlyUsed", (serviceRateLimitInfo.monthlyUsed + 1).toString());
		responseHeaders.set(
			"X-Service-MonthlyRemaining",
			Math.max(
				0,
				serviceRateLimitInfo.monthlyLimit - serviceRateLimitInfo.monthlyUsed - 1
			).toString()
		);
	}

	incrementServiceUsage(userData.id, service.id);

	const responseHeadersObj: Record<string, string> = {};
	responseHeaders.forEach((value, key) => {
		responseHeadersObj[key] = value;
	});

	const responseBody = new TextDecoder("utf-8", { fatal: false }).decode(responseBuffer);

	logRequestAsync({
		userId: userData.id,
		endpoint: incomingUrl.pathname,
		method: req.method,
		statusCode: upstreamResponse.status,
		latencyMs,
		ipAddress: req.headers.get("x-forwarded-for") || null,
		queryParams,
		requestHeaders,
		responseHeaders: responseHeadersObj,
		responseBody,
	});

	return new Response(responseBuffer, {
		status: upstreamResponse.status,
		headers: responseHeaders,
	});
});

export { proxy as proxyRoutes };
