import { Hono } from "hono";
import { cors } from "hono/cors";
import { startLogRetentionJob } from "./jobs/log-retention";
import { proxyRoutes } from "./routes/proxy";
import { usageRoutes } from "./routes/usage";
import "dotenv/config";

const app = new Hono();

// CORS configuration
app.use(
	"*",
	cors({
		origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
		allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		maxAge: 86400,
		credentials: true,
	})
);

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


const port = process.env.PUBLIC_API_PORT || 9990;
const hostname = process.env.HOST || "127.0.0.1";

console.log(`API Gateway running on ${hostname}:${port} with dynamic service routing`);

export default {
	port: Number(port),
	hostname,
	fetch: app.fetch,
};
