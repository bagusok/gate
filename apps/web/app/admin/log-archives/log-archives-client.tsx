"use client";

import { useQuery } from "@tanstack/react-query";
import {
	Archive,
	Calendar,
	ChevronLeft,
	ChevronRight,
	Clock,
	RefreshCw,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
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

interface LogSummary {
	id: string;
	userId: string;
	userName: string;
	userEmail: string;
	date: string;
	totalRequests: number;
	successfulRequests: number;
	failedRequests: number;
	averageLatencyMs: number;
	endpointUsage: unknown;
	lastUpdated: string;
}

interface LogArchivesClientProps {
	users: UserOption[];
}

export function LogArchivesClient({ users }: LogArchivesClientProps) {
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [selectedUserId, setSelectedUserId] = useState<string>("all");
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");
	const [selectedSummary, setSelectedSummary] = useState<LogSummary | null>(null);
	const [showDetailModal, setShowDetailModal] = useState(false);

	const summariesQuery = useQuery({
		queryKey: ["admin-log-summaries", page, limit, selectedUserId, startDate, endDate],
		queryFn: async () => {
			const params: Record<string, string | number> = { page, limit };
			if (selectedUserId !== "all") params.userId = selectedUserId;
			if (startDate) params.startDate = startDate;
			if (endDate) params.endDate = endDate;

			const response = await api.api.admin["log-summaries"].$get({ query: params as never });
			const result = await response.json();
			if (!result.success) throw new Error("Failed to fetch summaries");
			return result.data;
		},
	});

	const fetchSummaryDetail = async (summaryId: string) => {
		try {
			const response = await api.api.admin["log-summaries"][":id"].$get({
				param: { id: summaryId },
			});
			const result = await response.json();
			if (!result.success) throw new Error("Failed to fetch summary detail");
			setSelectedSummary(result.data as LogSummary);
			setShowDetailModal(true);
		} catch {
			toast.error("Failed to load summary details");
		}
	};

	const handleRefresh = () => {
		summariesQuery.refetch();
	};

	const getSuccessRate = (total: number, successful: number) => {
		if (total === 0) return 0;
		return ((successful / total) * 100).toFixed(1);
	};

	const getEndpointUsageEntries = (endpointUsage: unknown): [string, number][] => {
		if (!endpointUsage || typeof endpointUsage !== "object" || Array.isArray(endpointUsage)) {
			return [];
		}
		return Object.entries(endpointUsage as Record<string, number>)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10);
	};

	const summaries = summariesQuery.data?.summaries || [];
	const pagination = summariesQuery.data?.pagination;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Log Archives</h1>
					<p className="text-muted-foreground">View archived daily summaries of API requests</p>
				</div>
				<Button variant="outline" onClick={handleRefresh} disabled={summariesQuery.isFetching}>
					<RefreshCw
						className={`mr-2 h-4 w-4 ${summariesQuery.isFetching ? "animate-spin" : ""}`}
					/>
					Refresh
				</Button>
			</div>

			<Card>
				<CardHeader>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Archive className="h-5 w-5" />
								Archived Summaries
							</CardTitle>
							<CardDescription>{pagination?.total || 0} total archived records</CardDescription>
						</div>
						<div className="flex flex-wrap items-center gap-2">
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
							<div className="flex items-center gap-2">
								<Input
									type="date"
									className="w-36"
									value={startDate}
									onChange={(e) => {
										setStartDate(e.target.value);
										setPage(1);
									}}
									placeholder="Start date"
								/>
								<span className="text-muted-foreground">-</span>
								<Input
									type="date"
									className="w-36"
									value={endDate}
									onChange={(e) => {
										setEndDate(e.target.value);
										setPage(1);
									}}
									placeholder="End date"
								/>
							</div>
							{(startDate || endDate || selectedUserId !== "all") && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										setStartDate("");
										setEndDate("");
										setSelectedUserId("all");
										setPage(1);
									}}
								>
									Clear
								</Button>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{summariesQuery.isLoading ? (
						<div className="text-center py-8 text-muted-foreground">Loading...</div>
					) : summaries.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<Archive className="mx-auto h-12 w-12 mb-4 opacity-50" />
							<p>No archived summaries found</p>
							<p className="text-sm mt-1">
								Archives are created when logs older than 3 days are cleaned up
							</p>
						</div>
					) : (
						<>
							<div className="space-y-2">
								<div className="hidden md:grid grid-cols-7 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground">
									<div>Date</div>
									<div>User</div>
									<div>Total Requests</div>
									<div>Success</div>
									<div>Failed</div>
									<div>Success Rate</div>
									<div>Avg Latency</div>
								</div>
								{summaries.map((summary: LogSummary) => (
									<button
										key={summary.id}
										onClick={() => fetchSummaryDetail(summary.id)}
										className="grid grid-cols-2 md:grid-cols-7 gap-2 md:gap-4 rounded-lg border px-4 py-3 text-sm hover:bg-muted/50 cursor-pointer"
									>
										<div className="flex items-center gap-2">
											<Calendar className="h-4 w-4 text-muted-foreground" />
											<span>{summary.date}</span>
										</div>
										<div className="truncate" title={summary.userEmail}>
											{summary.userName}
										</div>
										<div className="font-medium">{summary.totalRequests.toLocaleString()}</div>
										<div className="flex items-center gap-1 text-green-600">
											<TrendingUp className="h-3 w-3" />
											{summary.successfulRequests.toLocaleString()}
										</div>
										<div className="flex items-center gap-1 text-red-600">
											<TrendingDown className="h-3 w-3" />
											{summary.failedRequests.toLocaleString()}
										</div>
										<div>
											<Badge
												variant={
													Number(
														getSuccessRate(summary.totalRequests, summary.successfulRequests)
													) >= 90
														? "success"
														: Number(
																	getSuccessRate(summary.totalRequests, summary.successfulRequests)
																) >= 70
															? "warning"
															: "destructive"
												}
											>
												{getSuccessRate(summary.totalRequests, summary.successfulRequests)}%
											</Badge>
										</div>
										<div className="flex items-center gap-1 text-muted-foreground">
											<Clock className="h-3 w-3" />
											{summary.averageLatencyMs.toFixed(0)}ms
										</div>
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
					className="max-w-2xl max-h-[90vh] overflow-y-auto"
					onClose={() => setShowDetailModal(false)}
				>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Archive className="h-5 w-5" />
							Summary Detail - {selectedSummary?.date}
						</DialogTitle>
					</DialogHeader>

					{selectedSummary && (
						<div className="space-y-6">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label className="text-muted-foreground text-xs">User</Label>
									<p className="font-medium">{selectedSummary.userName}</p>
									<p className="text-xs text-muted-foreground">{selectedSummary.userEmail}</p>
								</div>
								<div>
									<Label className="text-muted-foreground text-xs">Date</Label>
									<p className="font-medium">{selectedSummary.date}</p>
								</div>
							</div>

							<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
								<Card>
									<CardContent className="pt-4">
										<div className="text-2xl font-bold">
											{selectedSummary.totalRequests.toLocaleString()}
										</div>
										<p className="text-xs text-muted-foreground">Total Requests</p>
									</CardContent>
								</Card>
								<Card>
									<CardContent className="pt-4">
										<div className="text-2xl font-bold text-green-600">
											{selectedSummary.successfulRequests.toLocaleString()}
										</div>
										<p className="text-xs text-muted-foreground">Successful</p>
									</CardContent>
								</Card>
								<Card>
									<CardContent className="pt-4">
										<div className="text-2xl font-bold text-red-600">
											{selectedSummary.failedRequests.toLocaleString()}
										</div>
										<p className="text-xs text-muted-foreground">Failed</p>
									</CardContent>
								</Card>
								<Card>
									<CardContent className="pt-4">
										<div className="text-2xl font-bold">
											{selectedSummary.averageLatencyMs.toFixed(0)}ms
										</div>
										<p className="text-xs text-muted-foreground">Avg Latency</p>
									</CardContent>
								</Card>
							</div>

							<div>
								<Label className="text-muted-foreground text-xs">Success Rate</Label>
								<div className="mt-2">
									<div className="flex items-center justify-between mb-1">
										<span className="text-sm font-medium">
											{getSuccessRate(
												selectedSummary.totalRequests,
												selectedSummary.successfulRequests
											)}
											%
										</span>
									</div>
									<div className="w-full bg-muted rounded-full h-2.5">
										<div
											className="bg-green-600 h-2.5 rounded-full"
											style={{
												width: `${getSuccessRate(selectedSummary.totalRequests, selectedSummary.successfulRequests)}%`,
											}}
										/>
									</div>
								</div>
							</div>

							{getEndpointUsageEntries(selectedSummary.endpointUsage).length > 0 && (
								<div>
									<Label className="text-muted-foreground text-xs">Endpoint Usage</Label>
									<div className="mt-2 space-y-2">
										{getEndpointUsageEntries(selectedSummary.endpointUsage).map(
											([endpoint, count]) => (
												<div
													key={endpoint}
													className="flex items-center justify-between p-2 bg-muted rounded-md"
												>
													<code className="text-xs truncate flex-1 mr-4">{endpoint}</code>
													<Badge variant="outline">{count.toLocaleString()}</Badge>
												</div>
											)
										)}
									</div>
								</div>
							)}

							<div className="text-xs text-muted-foreground">
								Last updated: {new Date(selectedSummary.lastUpdated).toLocaleString()}
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
