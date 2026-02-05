import { eq } from "drizzle-orm";
import { db } from "../index";
import { account, plans, user } from "../schema";

async function hashApiKey(apiKey: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(apiKey);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateApiKey(): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const randomPart = Array.from(
		{ length: 32 },
		() => chars[Math.floor(Math.random() * chars.length)]
	).join("");
	return `pk_live_${randomPart}`;
}

function generateId(): string {
	return crypto.randomUUID();
}

export async function seed() {
	console.log("🌱 Seeding database...");

	console.log("Creating plans...");
	await db
		.insert(plans)
		.values([
			{
				planId: "free",
				name: "Free Tier",
				rateLimit: 100,
				rateInterval: "daily",
				priceMonthly: "0.00",
			},
			{
				planId: "pro",
				name: "Pro Tier",
				rateLimit: 2000,
				rateInterval: "daily",
				priceMonthly: "7.50",
			},
			{
				planId: "ultra",
				name: "Ultra Tier",
				rateLimit: 10000,
				rateInterval: "daily",
				priceMonthly: "14.99",
			},
			{
				planId: "enterprise",
				name: "Enterprise Tier",
				rateLimit: 48000,
				rateInterval: "daily",
				priceMonthly: "29.99",
			},
		])
		.onConflictDoNothing();

	console.log("Creating admin user...");
	const adminEmail = "admin@example.com";
	const adminPassword = await hashPassword("admin123");

	const existingAdmin = await db.query.user.findFirst({
		where: eq(user.email, adminEmail),
	});

	let adminUser: any;
	if (!existingAdmin) {
		const adminApiKey = generateApiKey();
		const adminApiKeyHash = await hashApiKey(adminApiKey);
		const adminId = generateId();

		const [newAdmin] = await db
			.insert(user)
			.values({
				id: adminId,
				name: "Admin User",
				email: adminEmail,
				emailVerified: true,
				role: "admin",
				planId: "enterprise",
				apiKey: adminApiKey,
				apiKeyHash: adminApiKeyHash,
			})
			.returning();
		adminUser = newAdmin;

		await db.insert(account).values({
			id: generateId(),
			userId: adminUser.id,
			accountId: adminUser.id,
			providerId: "credential",
			password: adminPassword,
		});

		console.log(`  Admin API Key: ${adminApiKey}`);
	} else {
		adminUser = existingAdmin;
		console.log("  Admin already exists, skipping...");
	}

	console.log("Creating test user...");
	const testEmail = "test@example.com";
	const testPassword = await hashPassword("test123");

	const existingTest = await db.query.user.findFirst({
		where: eq(user.email, testEmail),
	});

	let testUser: any;
	let testApiKey: string | undefined;
	if (!existingTest) {
		testApiKey = generateApiKey();
		const testApiKeyHash = await hashApiKey(testApiKey);
		const testId = generateId();

		const [newTest] = await db
			.insert(user)
			.values({
				id: testId,
				name: "Test User",
				email: testEmail,
				emailVerified: true,
				role: "user",
				planId: "free",
				apiKey: testApiKey,
				apiKeyHash: testApiKeyHash,
			})
			.returning();
		testUser = newTest;

		await db.insert(account).values({
			id: generateId(),
			userId: testUser.id,
			accountId: testUser.id,
			providerId: "credential",
			password: testPassword,
		});
	} else {
		testUser = existingTest;
		testApiKey = existingTest.apiKey || undefined;
		console.log("  Test user already exists, skipping...");
	}

	console.log("✅ Seeding completed!");
	console.log("-------------------------------------------");
	console.log("Admin credentials:");
	console.log("  Email: admin@example.com");
	console.log("  Password: admin123");
	console.log("");
	console.log("Test user credentials:");
	console.log("  Email: test@example.com");
	console.log("  Password: test123");
	if (testApiKey) {
		console.log(`  API Key: ${testApiKey}`);
	}
	console.log("-------------------------------------------");
}

seed()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("Seeding failed:", err);
		process.exit(1);
	});
