import { db, eq, siteSettings } from "@gate/database";
import { Hono } from "hono";

export const publicRoutes = new Hono()
	.get("/settings/:key", async (c) => {
		const key = c.req.param("key");

		const setting = await db.query.siteSettings.findFirst({
			where: eq(siteSettings.key, key),
		});

		if (!setting) {
			return c.json({ success: false, error: "Setting not found" }, 404);
		}

		return c.json({ success: true, data: setting });
	})
	.get("/settings", async (c) => {
		const keys = c.req.query("keys");

		if (!keys) {
			return c.json({ success: false, error: "No keys provided" }, 400);
		}

		const keyList = keys.split(",").map((k) => k.trim());
		const results: Record<string, string | null> = {};

		for (const key of keyList) {
			const setting = await db.query.siteSettings.findFirst({
				where: eq(siteSettings.key, key),
			});
			results[key] = setting?.value || null;
		}

		return c.json({ success: true, data: results });
	});
