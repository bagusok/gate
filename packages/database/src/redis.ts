import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
	throw new Error("REDIS_URL environment variable is not set.");
}

export const redis = new Redis(redisUrl, {
	lazyConnect: true,
	maxRetriesPerRequest: 3,
});

redis.on("error", (err) => {
	console.error("Redis connection error:", err);
});
