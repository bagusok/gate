"use client";

import { useQuery } from "@tanstack/react-query";
import {
	Activity,
	ChevronLeft,
	ChevronRight,
	RefreshCw,
	Search,
	TrendingUp,
	Users,
} from "lucide-react";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";

interface UserOption {
	id: string;
	name: string;
	email: string;
}

interface RequestLog {
	id: string;
	userId: string;
	userName: string;
	userEmail: string;
	timestamp: string;
	endpoint: string;
	method: string;
	statusCode: number;
	latencyMs: number;
	ipAddress: string;
}

interface LogDetail extends RequestLog {
	queryParams: unknown;
	requestHeaders: unknown;
	requestBody: string | null;
	responseHeaders: unknown;
	responseBody: string | null;
}

interface LogStats {
	totalToday: number;
	byUser: { userId: string; userName: string; userEmail: string; count: number }[];
	byEndpoint: { endpoint: string; count: number }[];
	byStatus: { statusCode: number; count: number }[];
}

interface RequestLogsClientProps {
	users: UserOption[];
}

const STATUS_OPTIONS = [
	{ value: "all", label: "All Status" },
	{ value: "200", label: "2xx Success" },
	{ value: "400", label: "4xx Client Error" },
	{ value: "500", label: "5xx Server Error" },
];

export function RequestLogsClient({ users }: RequestLogsClientProps) {
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [selectedUserId, setSelectedUserId] = useState<string>("all");
	const [selectedStatus, setSelectedStatus] = useState<string>("all");
	const [selectedLog, setSelectedLog] = useState<LogDetail | null>(null);
	const [showDetailModal, setShowDetailModal] = useState(false);

	const logsQuery = useQuery({
		queryKey: ["admin-logs", page, limit, search, selectedUserId, selectedStatus],
		queryFn: async () => {
			const params: Record<string, string | number> = { page, limit };
			if (search) params.search = search;
			if (selectedUserId !== "all") params.userId = selectedUserId;
			if (selectedStatus !== "all") params.status = parseInt(selectedStatus, 10);

			const response = await api.api.admin.logs.$get({ query: params as never });
			const result = await response.json();
			if (!result.success) throw new Error("Failed to fetch logs");
			return result.data;
		},
	});

	const statsQuery = useQuery({
		queryKey: ["admin-logs-stats"],
		queryFn: async () => {
			const response = await api.api.admin.logs.stats.$get();
			const result = await response.json();
			if (!result.success) throw new Error("Failed to fetch stats");
			return result.data as LogStats;
		},
	});

	const fetchLogDetail = useCallback(async (logId: string) => {
		try {
			const response = await api.api.admin.logs[":id"].$get({ param: { id: logId } });
			const result = await response.json();
			if (!result.success) throw new Error("Failed to fetch log detail");
			setSelectedLog(result.data as LogDetail);
			setShowDetailModal(true);
		} catch {
			toast.error("Failed to load log details");
		}
	}, []);

	const handleRefresh = () => {
		logsQuery.refetch();
		statsQuery.refetch();
	};

	const getStatusBadge = (statusCode: number) => {
		if (statusCode >= 200 && statusCode < 300) {
			return <Badge variant="success">{statusCode}</Badge>;
		} else if (statusCode >= 400 && statusCode < 500) {
			return <Badge variant="warning">{statusCode}</Badge>;
		} else if (statusCode >= 500) {
			return <Badge variant="destructive">{statusCode}</Badge>;
		}
		return <Badge variant="outline">{statusCode}</Badge>;
	};

	const getMethodColor = (method: string) => {
		const colors: Record<string, string> = {
			GET: "text-green-600",
			POST: "text-blue-600",
			PUT: "text-yellow-600",
			DELETE: "text-red-600",
			PATCH: "text-purple-600",
		};
		return colors[method] || "text-gray-600";
	};

	const formatJson = (data: unknown) => {
		if (!data) return "N/A";
		try {
			return JSON.stringify(data, null, 2);
		} catch {
			return String(data);
		}
	};

	const logs = logsQuery.data?.logs || [];
	const pagination = logsQuery.data?.pagination;
	const stats = statsQuery.data;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Request Logs</h1>
					<p className="text-muted-foreground">View and analyze all API request history</p>
				</div>
				<Button variant="outline" onClick={handleRefresh} disabled={logsQuery.isFetching}>
					<RefreshCw className={`mr-2 h-4 w-4 ${logsQuery.isFetching ? "animate-spin" : ""}`} />
					Refresh
				</Button>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Requests Today</CardTitle>
						<Activity className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats?.totalToday || 0}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Top User Today</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold truncate">
							{stats?.byUser?.[0]?.userName || "N/A"}
						</div>
						<p className="text-xs text-muted-foreground">
							{stats?.byUser?.[0]?.count || 0} requests
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Top Endpoint Today</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-lg font-bold truncate font-mono">
							{stats?.byEndpoint?.[0]?.endpoint || "N/A"}
						</div>
						<p className="text-xs text-muted-foreground">
							{stats?.byEndpoint?.[0]?.count || 0} requests
						</p>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<CardTitle>All Requests</CardTitle>
							<CardDescription>{pagination?.total || 0} total requests</CardDescription>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<div className="relative">
								<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									type="search"
									placeholder="Search endpoint..."
									className="w-48 pl-8"
									value={search}
									onChange={(e) => {
										setSearch(e.target.value);
										setPage(1);
									}}
								/>
							</div>
							<Select
								value={selectedUserId}
								onValueChange={(v) => {
									setSelectedUserId(v);
									setPage(1);
								}}
							>
								<SelectTrigger className="w-40">
									<SelectValue placeholder="All Users" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Users</SelectItem>
									{users.map((u) => (
										<SelectItem key={u.id} value={u.id}>
											{u.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={selectedStatus}
								onValueChange={(v) => {
									setSelectedStatus(v);
									setPage(1);
								}}
							>
								<SelectTrigger className="w-36">
									<SelectValue placeholder="All Status" />
								</SelectTrigger>
								<SelectContent>
									{STATUS_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{logsQuery.isLoading ? (
						<div className="text-center py-8 text-muted-foreground">Loading...</div>
					) : logs.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">No request logs found</div>
					) : (
						<>
							<div className="space-y-2">
								<div className="hidden md:grid grid-cols-7 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground">
									<div>Timestamp</div>
									<div>User</div>
									<div>Method</div>
									<div className="col-span-2">Endpoint</div>
									<div>Status</div>
									<div>Latency</div>
								</div>
								{logs.map((log: RequestLog) => (
									<button
										key={log.id}
										onClick={() => fetchLogDetail(log.id)}
										className="grid grid-cols-2 md:grid-cols-7 gap-2 md:gap-4 rounded-lg border px-4 py-3 text-sm hover:bg-muted/50 cursor-pointer"
									>
										<div className="text-muted-foreground text-xs md:text-sm">
											{new Date(log.timestamp).toLocaleString()}
										</div>
										<div className="truncate text-xs md:text-sm" title={log.userEmail}>
											{log.userName}
										</div>
										<div className={`font-mono font-medium ${getMethodColor(log.method)}`}>
											{log.method}
										</div>
										<div className="col-span-2 font-mono truncate text-xs md:text-sm">
											{log.endpoint}
										</div>
										<div>{getStatusBadge(log.statusCode)}</div>
										<div className="text-muted-foreground">{log.latencyMs}ms</div>
									</button>
								))}
							</div>

							{pagination && (
								<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4 pt-4 border-t">
									<div className="flex items-center gap-4">
										<p className="text-sm text-muted-foreground">
											Showing {(pagination.page - 1) * pagination.limit + 1}-
											{Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
											{pagination.total}
										</p>
										<div className="flex items-center gap-2">
											<span className="text-sm text-muted-foreground">Per page:</span>
											<Select
												value={limit.toString()}
												onValueChange={(v) => {
													setLimit(parseInt(v, 10));
													setPage(1);
												}}
											>
												<SelectTrigger className="w-20 h-8">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="10">10</SelectItem>
													<SelectItem value="20">20</SelectItem>
													<SelectItem value="50">50</SelectItem>
													<SelectItem value="100">100</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-sm text-muted-foreground">
											Page {pagination.page} of {pagination.totalPages}
										</span>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											disabled={pagination.page <= 1}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => p + 1)}
											disabled={pagination.page >= pagination.totalPages}
										>
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>

			<Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
				<DialogContent
					className="max-w-3xl max-h-[90vh] overflow-y-auto"
					onClose={() => setShowDetailModal(false)}
				>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							Request Detail
							{selectedLog && getStatusBadge(selectedLog.statusCode)}
						</DialogTitle>
					</DialogHeader>

					{selectedLog && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label className="text-muted-foreground text-xs">Timestamp</Label>
									<p className="font-medium">{new Date(selectedLog.timestamp).toLocaleString()}</p>
								</div>
								<div>
									<Label className="text-muted-foreground text-xs">User</Label>
									<p className="font-medium">{selectedLog.userName}</p>
									<p className="text-xs text-muted-foreground">{selectedLog.userEmail}</p>
								</div>
								<div>
									<Label className="text-muted-foreground text-xs">Method</Label>
									<p className={`font-mono font-medium ${getMethodColor(selectedLog.method)}`}>
										{selectedLog.method}
									</p>
								</div>
								<div>
									<Label className="text-muted-foreground text-xs">Latency</Label>
									<p className="font-medium">{selectedLog.latencyMs}ms</p>
								</div>
								<div className="col-span-2">
									<Label className="text-muted-foreground text-xs">Endpoint</Label>
									<p className="font-mono text-sm break-all">{selectedLog.endpoint}</p>
								</div>
								<div className="col-span-2">
									<Label className="text-muted-foreground text-xs">IP Address</Label>
									<p className="font-mono">{selectedLog.ipAddress || "N/A"}</p>
								</div>
							</div>

							<div className="space-y-3">
								<div>
									<Label className="text-muted-foreground text-xs">Query Parameters</Label>
									<pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto max-h-32">
										{formatJson(selectedLog.queryParams)}
									</pre>
								</div>

								<div>
									<Label className="text-muted-foreground text-xs">Request Headers</Label>
									<pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto max-h-32">
										{formatJson(selectedLog.requestHeaders)}
									</pre>
								</div>

								<div>
									<Label className="text-muted-foreground text-xs">Request Body</Label>
									<pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto max-h-32">
										{selectedLog.requestBody || "N/A"}
									</pre>
								</div>

								<div>
									<Label className="text-muted-foreground text-xs">Response Headers</Label>
									<pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto max-h-32">
										{formatJson(selectedLog.responseHeaders)}
									</pre>
								</div>

								<div>
									<Label className="text-muted-foreground text-xs">Response Body</Label>
									<pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto max-h-48">
										{selectedLog.responseBody || "N/A"}
									</pre>
								</div>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
