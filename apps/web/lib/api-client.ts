import { hc } from "hono/client";
import type { AppType } from "./hono";

function getBaseUrl() {
	if (typeof window !== "undefined") {
		return window.location.origin;
	}
	const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
	return url.replace(/\/api$/, "");
}

export const api = hc<AppType>(getBaseUrl());
