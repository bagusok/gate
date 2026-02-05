import { Hono } from "hono";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { dashboardRoutes } from "./routes/dashboard";
import { publicRoutes } from "./routes/public";
import { userRoutes } from "./routes/user";

const app = new Hono().basePath("/api");

const routes = app
	.route("/auth", authRoutes)
	.route("/dashboard", dashboardRoutes)
	.route("/admin", adminRoutes)
	.route("/user", userRoutes)
	.route("/public", publicRoutes);

export type AppType = typeof routes;
export { routes as api };
