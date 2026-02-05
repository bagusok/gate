import { auth } from "@gate/auth";
import { Hono } from "hono";

export const authRoutes = new Hono().all("/*", async (c) => {
	return auth.handler(c.req.raw);
});
