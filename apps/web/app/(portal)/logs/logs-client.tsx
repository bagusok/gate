"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
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

interface RequestLog {
	id: string;
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

export function LogsClient() {
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedLog, setSelectedLog] = useState<LogDetail | null>(null);
	const [showDetailModal, setShowDetailModal] = useState(false);

	const logsQuery = useQuery({
		queryKey: ["user-logs", page, limit],
		queryFn: async () => {
			const response = await api.api.user.logs.$get({
				query: { page, limit } as never,
			});
			const result = await response.json();
			if (!result.success) throw new Error("Failed to fetch logs");
			return result.data;
		},
	});

	const fetchLogDetail = useCallback(async (logId: string) => {
		try {
			const response = await api.api.user.logs[":id"].$get({
				param: { id: logId },
			});
			const result = await response.json();
			if (!result.success) throw new Error("Failed to fetch log detail");
			setSelectedLog(result.data as LogDetail);
			setShowDetailModal(true);
		} catch {
			toast.error("Failed to load log details");
		}
	}, []);

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

	const filteredLogs = logs.filter(
		(log: RequestLog) =>
			log.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
			log.method.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Request Logs</h1>
					<p className="text-muted-foreground">View and analyze your API request history</p>
				</div>
				<Button
					variant="outline"
					onClick={() => logsQuery.refetch()}
					disabled={logsQuery.isFetching}
				>
					<RefreshCw className={`mr-2 h-4 w-4 ${logsQuery.isFetching ? "animate-spin" : ""}`} />
					Refresh
				</Button>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Recent Requests</CardTitle>
							<CardDescription>{pagination?.total || 0} total requests</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							<div className="relative">
								<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									type="search"
									placeholder="Search logs..."
									className="w-64 pl-8"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{logsQuery.isLoading ? (
						<div className="text-center py-8 text-muted-foreground">Loading...</div>
					) : logs.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<p>No request logs yet. Make some API requests to see them here.</p>
						</div>
					) : (
						<>
							<div className="space-y-2">
								<div className="grid grid-cols-6 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground">
									<div>Timestamp</div>
									<div>Method</div>
									<div className="col-span-2">Endpoint</div>
									<div>Status</div>
									<div>Latency</div>
								</div>
								{filteredLogs.map((log: RequestLog) => (
									<button
										key={log.id}
										onClick={() => fetchLogDetail(log.id)}
										className="grid grid-cols-6 gap-4 rounded-lg border px-4 py-3 text-sm hover:bg-muted/50 cursor-pointer"
									>
										<div className="text-muted-foreground">
											{new Date(log.timestamp).toLocaleTimeString()}
										</div>
										<div className={`font-mono font-medium ${getMethodColor(log.method)}`}>
											{log.method}
										</div>
										<div className="col-span-2 font-mono truncate">{log.endpoint}</div>
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
									<Label className="text-muted-foreground text-xs">Latency</Label>
									<p className="font-medium">{selectedLog.latencyMs}ms</p>
								</div>
								<div>
									<Label className="text-muted-foreground text-xs">Method</Label>
									<p className={`font-mono font-medium ${getMethodColor(selectedLog.method)}`}>
										{selectedLog.method}
									</p>
								</div>
								<div>
									<Label className="text-muted-foreground text-xs">IP Address</Label>
									<p className="font-mono">{selectedLog.ipAddress || "N/A"}</p>
								</div>
								<div className="col-span-2">
									<Label className="text-muted-foreground text-xs">Endpoint</Label>
									<p className="font-mono text-sm break-all">{selectedLog.endpoint}</p>
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
