import { Hono } from "hono";
import { cors } from "hono/cors";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { dashboardRoutes } from "./routes/dashboard";
import { publicRoutes } from "./routes/public";
import { userRoutes } from "./routes/user";
import "dotenv/config";

const app = new Hono().basePath("/api");

// CORS configuration for Hono routes
app.use(
	"*",
	cors({
		origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
		allowHeaders: ["Content-Type", "Authorization", "User-Agent"],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		exposeHeaders: ["Content-Length"],
		maxAge: 600,
		credentials: true,
	})
);

const routes = app
	.route("/auth", authRoutes)
	.route("/dashboard", dashboardRoutes)
	.route("/admin", adminRoutes)
	.route("/user", userRoutes)
	.route("/public", publicRoutes);

export type AppType = typeof routes;
export { routes as api };
