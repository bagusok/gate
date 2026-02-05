import { Hono } from "hono";
import { startLogRetentionJob } from "./jobs/log-retention";
import { proxyRoutes } from "./routes/proxy";
import { usageRoutes } from "./routes/usage";

const app = new Hono();

app.get("/", (c) => {
	return c.json({
		status: true,
		data: {
			name: "Paid Endpoint API Gateway",
			version: "1.0.0",
			endpoints: {
				health: "GET /health",
				usage: "GET /user/usage",
				proxy: "ALL /proxy/*",
			},
			documentation: "https://docs.example.com",
		},
	});
});

app.get("/health", (c) => {
	return c.json({
		status: true,
		data: {
			healthy: true,
			timestamp: new Date().toISOString(),
		},
	});
});

app.route("/user", usageRoutes);
app.route("/proxy", proxyRoutes);

app.notFound((c) => {
	return c.json(
		{
			status: false,
			message: "Endpoint not found",
			code: 404,
			error: "NOT_FOUND",
		},
		404
	);
});

app.onError((err, c) => {
	console.error("Unhandled error:", err);
	return c.json(
		{
			status: false,
			message: err.message || "Internal Server Error",
			code: 500,
			error: "INTERNAL_ERROR",
		},
		500
	);
});

const stopLogRetention = startLogRetentionJob({
	cron: "0 0 * * *",
	cronTimezone: "UTC",
});

process.on("SIGINT", async () => {
	console.log("Shutting down...");
	await stopLogRetention();
	process.exit(0);
});

console.log("API Gateway running on port 9990 with dynamic service routing");

export default {
	port: 9990,
	fetch: app.fetch,
};
