import { db, type InferInsertModel, logSummaries, sql } from "@gate/database";
import { type Job, Queue, type RepeatOptions, Worker } from "bullmq";

const MS_IN_DAY = 86_400_000;
const QUEUE_NAME = "log-retention";

type LogSummaryInsert = InferInsertModel<typeof logSummaries>;

export type LogRetentionOptions = {
	retentionDays?: number;
	intervalMs?: number;
	cron?: string;
	cronTimezone?: string;
};

export async function runLogRetentionJob(options: LogRetentionOptions = {}): Promise<void> {
	const retentionDays = options.retentionDays ?? 3;
	const cutoff = new Date(Date.now() - retentionDays * MS_IN_DAY);

	await db.transaction(async (tx) => {
		const { rows } = await tx.execute(sql<{
			user_id: string;
			day: string;
			total_requests: number;
			successful_requests: number;
			failed_requests: number;
			average_latency_ms: string | null;
			endpoint_usage: unknown;
		}>`
      WITH filtered AS (
        SELECT
          user_id,
          date_trunc('day', timestamp)::date AS day,
          status_code,
          latency_ms,
          endpoint
        FROM request_logs
        WHERE timestamp < ${cutoff}
      ),
      base AS (
        SELECT
          user_id,
          day,
          COUNT(*) AS total_requests,
          COUNT(*) FILTER (WHERE status_code BETWEEN 200 AND 299) AS successful_requests,
          COUNT(*) FILTER (WHERE status_code >= 400) AS failed_requests,
          ROUND(AVG(latency_ms)::numeric, 2)::text AS average_latency_ms
        FROM filtered
        GROUP BY user_id, day
      ),
      endpoint_counts AS (
        SELECT
          user_id,
          day,
          jsonb_object_agg(endpoint, cnt) AS endpoint_usage
        FROM (
          SELECT
            user_id,
            day,
            endpoint,
            COUNT(*) AS cnt
          FROM filtered
          GROUP BY user_id, day, endpoint
        ) grouped_endpoints
        GROUP BY user_id, day
      )
      SELECT
        base.user_id,
        base.day,
        base.total_requests,
        base.successful_requests,
        base.failed_requests,
        base.average_latency_ms,
        COALESCE(endpoint_counts.endpoint_usage, '{}'::jsonb) AS endpoint_usage
      FROM base
      LEFT JOIN endpoint_counts
        ON endpoint_counts.user_id = base.user_id
       AND endpoint_counts.day = base.day;
    `);

		for (const row of rows) {
			const summaryData: LogSummaryInsert = {
				userId: String(row.user_id),
				date: String(row.day),
				totalRequests: Number(row.total_requests ?? 0),
				successfulRequests: Number(row.successful_requests ?? 0),
				failedRequests: Number(row.failed_requests ?? 0),
				averageLatencyMs: (row.average_latency_ms ?? "0") as LogSummaryInsert["averageLatencyMs"],
				endpointUsage: (row.endpoint_usage ?? {}) as Record<string, number>,
			};

			await tx
				.insert(logSummaries)
				.values(summaryData)
				.onConflictDoUpdate({
					target: [logSummaries.userId, logSummaries.date],
					set: {
						totalRequests: summaryData.totalRequests,
						successfulRequests: summaryData.successfulRequests,
						failedRequests: summaryData.failedRequests,
						averageLatencyMs: summaryData.averageLatencyMs,
						endpointUsage: summaryData.endpointUsage,
						lastUpdated: sql`CURRENT_TIMESTAMP`,
					},
				});
		}

		await tx.execute(sql`
      DELETE FROM request_logs
      WHERE timestamp < ${cutoff};
    `);
	});
}

export function startLogRetentionJob(options: LogRetentionOptions = {}): () => Promise<void> {
	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl) {
		throw new Error("REDIS_URL environment variable is not set.");
	}

	const connection = { connection: { url: redisUrl } } as const;

	const queue = new Queue(QUEUE_NAME, connection);

	const worker = new Worker(
		QUEUE_NAME,
		async () => {
			await runLogRetentionJob(options);
		},
		connection
	);

	worker.on("completed", (job: Job) => {
		console.log(
			`Log retention job completed via BullMQ at ${new Date().toISOString()} (jobId=${job.id})`
		);
	});

	worker.on("failed", (job: Job | undefined, err: Error) => {
		console.error(`Log retention job failed via BullMQ (jobId=${job?.id ?? "unknown"}):`, err);
	});

	const repeatOptions: RepeatOptions = options.cron
		? {
				pattern: options.cron,
				immediately: true,
				tz: options.cronTimezone,
			}
		: { every: options.intervalMs ?? MS_IN_DAY };

	void queue
		.add(
			QUEUE_NAME,
			{},
			{
				jobId: QUEUE_NAME,
				repeat: repeatOptions,
				removeOnComplete: true,
				removeOnFail: false,
			}
		)
		.catch((err: unknown) => {
			console.error("Failed to schedule log retention job via BullMQ:", err);
		});

	void runLogRetentionJob(options).catch((err: unknown) => {
		console.error("Initial log retention run failed:", err);
	});

	return async () => {
		try {
			await queue.removeRepeatable(QUEUE_NAME, repeatOptions);
		} catch (err) {
			console.warn("Failed to remove repeatable log retention job:", err);
		}

		await Promise.allSettled([worker.close(), queue.close()]);
	};
}
