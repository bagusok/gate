import { db, schema, UserRole } from "@gate/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

function generateApiKey(): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const randomPart = Array.from(
		{ length: 32 },
		() => chars[Math.floor(Math.random() * chars.length)]
	).join("");
	return `pk_live_${randomPart}`;
}

async function hashApiKey(key: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(key);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	emailAndPassword: {
		enabled: true,
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
	},
	user: {
		additionalFields: {
			role: {
				type: ["user", "admin"],
				required: false,
				defaultValue: UserRole.USER,
				input: false,
			},
			planId: {
				type: "string",
				required: false,
				defaultValue: "free",
				input: false,
			},
			planExpiresAt: {
				type: "date",
				required: false,
				input: false,
			},
			apiKey: {
				type: "string",
				required: false,
				input: false,
			},
			apiKeyHash: {
				type: "string",
				required: false,
				input: false,
			},
		},
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					const apiKey = generateApiKey();
					const apiKeyHash = await hashApiKey(apiKey);
					return {
						data: {
							...user,
							planId: "free",
							apiKey,
							apiKeyHash,
						},
					};
				},
			},
		},
	},
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
