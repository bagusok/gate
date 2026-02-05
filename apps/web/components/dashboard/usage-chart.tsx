"use client";

import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartDataPoint {
	date: string;
	requests: number;
	successful: number;
	failed: number;
}

interface UsageChartProps {
	data: ChartDataPoint[];
}

export function UsageChart({ data }: UsageChartProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>API Usage</CardTitle>
				<CardDescription>Request volume over the last 7 days</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="h-[300px] sm:h-[350px]">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
							<defs>
								<linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
									<stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
								</linearGradient>
								<linearGradient id="colorSuccessful" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
									<stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
							<XAxis
								dataKey="date"
								className="text-xs"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tickFormatter={(value) => {
									const date = new Date(value);
									return date.toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
									});
								}}
							/>
							<YAxis className="text-xs" tickLine={false} axisLine={false} tickMargin={8} />
							<Tooltip
								contentStyle={{
									backgroundColor: "hsl(var(--card))",
									border: "1px solid hsl(var(--border))",
									borderRadius: "0.75rem",
									boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
								}}
								labelFormatter={(value) => {
									const date = new Date(value);
									return date.toLocaleDateString("en-US", {
										weekday: "short",
										month: "short",
										day: "numeric",
									});
								}}
							/>
							<Area
								type="monotone"
								dataKey="successful"
								stroke="hsl(var(--chart-2))"
								strokeWidth={2}
								fill="url(#colorSuccessful)"
								name="Successful"
							/>
							<Area
								type="monotone"
								dataKey="requests"
								stroke="hsl(var(--primary))"
								strokeWidth={2}
								fill="url(#colorRequests)"
								name="Total"
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	);
}
