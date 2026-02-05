import { Activity, Clock, Key, TrendingUp } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { UsageChart } from "@/components/dashboard/usage-chart";
import { getDashboardStats, verifySession } from "@/lib/dal";

export default async function DashboardPage() {
	const session = await verifySession();
	const stats = await getDashboardStats(session.user.id);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold lg:text-3xl">Dashboard</h1>
				<p className="text-muted-foreground">Monitor your API usage and performance</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatsCard
					title="Total Requests"
					value={stats.totalRequests.toLocaleString()}
					description="This month"
					icon={<Activity className="h-5 w-5" />}
				/>
				<StatsCard
					title="API Key"
					value={stats.hasApiKey ? "Active" : "None"}
					description={stats.hasApiKey ? "Ready to use" : "Generate one now"}
					icon={<Key className="h-5 w-5" />}
				/>
				<StatsCard
					title="Avg Response"
					value={`${stats.avgResponseTime}ms`}
					description="Last 24 hours"
					icon={<Clock className="h-5 w-5" />}
				/>
				<StatsCard
					title="Success Rate"
					value={`${stats.successRate}%`}
					description="Last 7 days"
					icon={<TrendingUp className="h-5 w-5" />}
				/>
			</div>

			<UsageChart data={stats.chartData} />
		</div>
	);
}
