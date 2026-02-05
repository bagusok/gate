"use client";

import { Filter, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SystemLog {
	id: string;
	level: "info" | "warning" | "error";
	message: string;
	source: string;
	timestamp: string;
}

const mockLogs: SystemLog[] = [
	{
		id: "1",
		level: "info",
		message: "User john@example.com logged in",
		source: "auth",
		timestamp: "2026-01-31T10:30:00Z",
	},
	{
		id: "2",
		level: "warning",
		message: "Rate limit exceeded for key pk_live_xxx",
		source: "api-gateway",
		timestamp: "2026-01-31T10:25:00Z",
	},
	{
		id: "3",
		level: "error",
		message: "Database connection timeout",
		source: "database",
		timestamp: "2026-01-31T10:20:00Z",
	},
	{
		id: "4",
		level: "info",
		message: "New API key generated for client abc123",
		source: "api-keys",
		timestamp: "2026-01-31T10:15:00Z",
	},
	{
		id: "5",
		level: "info",
		message: "Log retention job completed",
		source: "scheduler",
		timestamp: "2026-01-31T00:00:00Z",
	},
];

export default function SystemLogsPage() {
	const [searchQuery, setSearchQuery] = useState("");

	const getLevelBadge = (level: SystemLog["level"]) => {
		switch (level) {
			case "info":
				return <Badge variant="secondary">INFO</Badge>;
			case "warning":
				return <Badge variant="warning">WARN</Badge>;
			case "error":
				return <Badge variant="destructive">ERROR</Badge>;
		}
	};

	const filteredLogs = mockLogs.filter(
		(log) =>
			log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
			log.source.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold sm:text-3xl">System Logs</h1>
					<p className="text-muted-foreground">View system events and error logs</p>
				</div>
				<Button variant="outline" className="w-full sm:w-auto">
					<RefreshCw className="mr-2 h-4 w-4" />
					Refresh
				</Button>
			</div>

			<Card>
				<CardHeader className="space-y-4">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<CardTitle>Recent Logs</CardTitle>
							<CardDescription>System events from all services</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							<div className="relative flex-1 sm:flex-none">
								<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									type="search"
									placeholder="Search logs..."
									className="w-full sm:w-64 pl-8"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
							</div>
							<Button variant="outline" size="icon" className="shrink-0">
								<Filter className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{filteredLogs.map((log) => (
							<div
								key={log.id}
								className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:gap-4 sm:p-4"
							>
								<div className="shrink-0">{getLevelBadge(log.level)}</div>
								<div className="flex-1 space-y-1 min-w-0">
									<p className="text-sm break-words">{log.message}</p>
									<div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
										<span>Source: {log.source}</span>
										<span>{new Date(log.timestamp).toLocaleString()}</span>
									</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
