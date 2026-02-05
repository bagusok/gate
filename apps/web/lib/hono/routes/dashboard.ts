import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

export const dashboardRoutes = new Hono()
	.get("/stats", async (c) => {
		return c.json({
			success: true,
			data: {
				totalRequests: 12345,
				successfulRequests: 11000,
				failedRequests: 1345,
				averageLatency: 45.2,
				activeApiKeys: 3,
			},
		});
	})
	.get(
		"/chart-data",
		zValidator("query", z.object({ days: z.coerce.number().optional() })),
		async (c) => {
			const { days = 7 } = c.req.valid("query");
			const data = [];
			for (let i = days - 1; i >= 0; i--) {
				const date = new Date();
				date.setDate(date.getDate() - i);
				data.push({
					date: date.toISOString().split("T")[0],
					requests: Math.floor(Math.random() * 500) + 100,
					successful: Math.floor(Math.random() * 450) + 90,
					failed: Math.floor(Math.random() * 50) + 10,
				});
			}
			return c.json({ success: true, data });
		}
	);
