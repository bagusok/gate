import { Activity, CreditCard, Key, Users } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { UsageChart } from "@/components/dashboard/usage-chart";
import { getAdminDashboardStats } from "@/lib/dal";

export default async function AdminDashboardPage() {
	const stats = await getAdminDashboardStats();

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold sm:text-3xl">Admin Dashboard</h1>
				<p className="text-muted-foreground">System-wide analytics and metrics</p>
			</div>

			<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
				<StatsCard
					title="Total Requests"
					value={stats.totalRequests.toLocaleString()}
					description="All time"
					icon={<Activity className="h-4 w-4" />}
				/>
				<StatsCard
					title="Total Users"
					value={stats.totalUsers.toLocaleString()}
					description="Registered users"
					icon={<Users className="h-4 w-4" />}
				/>
				<StatsCard
					title="Users with API Keys"
					value={stats.usersWithApiKey.toLocaleString()}
					description={`of ${stats.totalUsers} users`}
					icon={<Key className="h-4 w-4" />}
				/>
				<StatsCard
					title="Active Plans"
					value={stats.totalPlans.toLocaleString()}
					description="Available plans"
					icon={<CreditCard className="h-4 w-4" />}
				/>
			</div>

			<UsageChart data={stats.chartData} />
		</div>
	);
}
