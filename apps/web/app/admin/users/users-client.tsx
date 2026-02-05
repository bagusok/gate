"use client";

import { useMutation } from "@tanstack/react-query";
import { Copy, Edit2, Key, RefreshCw, Search, Shuffle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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

export interface UserData {
	id: string;
	name: string;
	email: string;
	role: "user" | "admin";
	status: "active";
	planId: string | null;
	planName: string;
	planExpiresAt: string | null;
	createdAt: string;
	apiKey: string | null;
}

export interface PlanOption {
	planId: string;
	name: string;
}

interface UsersClientProps {
	users: UserData[];
	plans: PlanOption[];
}

interface ChangePlanFormData {
	planId: string;
	duration: string;
}

interface RenewFormData {
	months: string;
}

const DURATION_OPTIONS = [
	{ value: "1", label: "1 Month" },
	{ value: "2", label: "2 Months" },
	{ value: "3", label: "3 Months" },
	{ value: "6", label: "6 Months" },
	{ value: "12", label: "1 Year" },
];

function formatDate(dateString: string | null): string {
	if (!dateString) return "No Expiration";
	return new Date(dateString).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function getExpirationStatus(
	expiresAt: string | null,
	planId: string | null
): {
	label: string;
	variant: "default" | "destructive" | "outline" | "secondary";
} {
	if (planId === "free" || !expiresAt) {
		return { label: "No Expiration", variant: "secondary" };
	}

	const now = new Date();
	const expDate = new Date(expiresAt);
	const daysUntil = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

	if (daysUntil < 0) {
		return { label: "Expired", variant: "destructive" };
	}
	if (daysUntil <= 7) {
		return { label: `Expires in ${daysUntil}d`, variant: "outline" };
	}
	return { label: formatDate(expiresAt), variant: "secondary" };
}

function calculateExpiresAt(months: number): string {
	const date = new Date();
	date.setMonth(date.getMonth() + months);
	return date.toISOString();
}

export function UsersClient({ users, plans }: UsersClientProps) {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");

	const [showChangePlanModal, setShowChangePlanModal] = useState(false);
	const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

	const [showRenewModal, setShowRenewModal] = useState(false);
	const [showApiKeyModal, setShowApiKeyModal] = useState(false);
	const [apiKeyInput, setApiKeyInput] = useState("");

	const changePlanForm = useForm<ChangePlanFormData>({
		defaultValues: { planId: "", duration: "1" },
	});

	const renewForm = useForm<RenewFormData>({
		defaultValues: { months: "1" },
	});

	const changePlanMutation = useMutation({
		mutationFn: async (data: ChangePlanFormData) => {
			if (!selectedUser) throw new Error("No user selected");

			const body: { planId: string; expiresAt?: string } = {
				planId: data.planId,
			};
			if (data.planId !== "free") {
				body.expiresAt = calculateExpiresAt(parseInt(data.duration, 10));
			}

			const response = await api.api.admin.users[":id"].plan.$put({
				param: { id: selectedUser.id },
				json: body,
			});

			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error || "Failed to change plan");
			}
			return result;
		},
		onSuccess: () => {
			toast.success("Plan changed successfully");
			setShowChangePlanModal(false);
			setSelectedUser(null);
			changePlanForm.reset();
			router.refresh();
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const renewMutation = useMutation({
		mutationFn: async (data: RenewFormData) => {
			if (!selectedUser) throw new Error("No user selected");

			const response = await api.api.admin.users[":id"].renew.$post({
				param: { id: selectedUser.id },
				json: {
					months: parseInt(data.months, 10),
				},
			});
			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error || "Failed to renew plan");
			}
			return result;
		},
		onSuccess: () => {
			toast.success("Plan renewed successfully");
			setShowRenewModal(false);
			setSelectedUser(null);
			renewForm.reset();
			router.refresh();
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const updateApiKeyMutation = useMutation({
		mutationFn: async (apiKey: string) => {
			if (!selectedUser) throw new Error("No user selected");

			const response = await api.api.admin.users[":id"].apikey.$put({
				param: { id: selectedUser.id },
				json: { apiKey },
			});

			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error || "Failed to update API key");
			}
			return result;
		},
		onSuccess: () => {
			toast.success("API key updated successfully");
			setShowApiKeyModal(false);
			setSelectedUser(null);
			setApiKeyInput("");
			router.refresh();
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const deleteApiKeyMutation = useMutation({
		mutationFn: async () => {
			if (!selectedUser) throw new Error("No user selected");

			const response = await api.api.admin.users[":id"].apikey.$delete({
				param: { id: selectedUser.id },
			});

			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error || "Failed to remove API key");
			}
			return result;
		},
		onSuccess: () => {
			toast.success("API key removed successfully");
			setShowApiKeyModal(false);
			setSelectedUser(null);
			setApiKeyInput("");
			router.refresh();
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const filteredUsers = users.filter(
		(user) =>
			user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.email.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const openChangePlanModal = (user: UserData) => {
		setSelectedUser(user);
		changePlanForm.reset({ planId: user.planId || "", duration: "1" });
		setShowChangePlanModal(true);
	};

	const openRenewModal = (user: UserData) => {
		setSelectedUser(user);
		renewForm.reset({ months: "1" });
		setShowRenewModal(true);
	};

	const openApiKeyModal = (user: UserData) => {
		setSelectedUser(user);
		setApiKeyInput(user.apiKey || "");
		setShowApiKeyModal(true);
	};

	const generateRandomApiKey = () => {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		const prefix = "pk_";
		let key = prefix;
		for (let i = 0; i < 32; i++) {
			key += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		setApiKeyInput(key);
	};

	const copyApiKey = async () => {
		if (selectedUser?.apiKey) {
			await navigator.clipboard.writeText(selectedUser.apiKey);
			toast.success("API key copied to clipboard");
		}
	};

	const watchedPlanId = changePlanForm.watch("planId");
	const watchedDuration = changePlanForm.watch("duration");

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold sm:text-3xl">Users</h1>
					<p className="text-muted-foreground">Manage all platform users</p>
				</div>
			</div>

			<Card>
				<CardHeader className="space-y-4">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<CardTitle>All Users</CardTitle>
							<CardDescription>{users.length} users total</CardDescription>
						</div>
						<div className="relative w-full sm:w-64">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								type="search"
								placeholder="Search users..."
								className="w-full pl-8"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{filteredUsers.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">No users found</div>
						) : (
							filteredUsers.map((user) => {
								const expStatus = getExpirationStatus(user.planExpiresAt, user.planId);
								const canRenew = user.planId && user.planId !== "free";

								return (
									<div
										key={user.id}
										className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
									>
										<div className="flex items-center gap-3 min-w-0">
											<Avatar className="h-10 w-10 shrink-0">
												<AvatarImage src="" alt={user.name} />
												<AvatarFallback>
													{user.name
														.split(" ")
														.map((n) => n[0])
														.join("")}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													<span className="font-medium truncate">{user.name}</span>
													{user.role === "admin" && <Badge variant="secondary">Admin</Badge>}
												</div>
												<p className="text-sm text-muted-foreground truncate">{user.email}</p>
											</div>
										</div>

										<div className="flex flex-wrap items-center gap-3 md:gap-4 pl-13 md:pl-0">
											<div className="flex flex-col gap-1">
												<Badge variant="outline">{user.planName}</Badge>
												<Badge variant={expStatus.variant} className="text-xs w-fit">
													{expStatus.label}
												</Badge>
											</div>

											<div className="hidden sm:block text-right">
												<p className="text-xs text-muted-foreground">Joined</p>
												<p className="text-sm">{user.createdAt}</p>
											</div>

											<div className="flex gap-1 ml-auto md:ml-0">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => openApiKeyModal(user)}
													title="Manage API Key"
												>
													<Key className="h-4 w-4" />
												</Button>
												{canRenew && (
													<Button
														variant="ghost"
														size="icon"
														onClick={() => openRenewModal(user)}
														title="Renew Plan"
													>
														<RefreshCw className="h-4 w-4" />
													</Button>
												)}
												<Button
													variant="ghost"
													size="icon"
													onClick={() => openChangePlanModal(user)}
													title="Change Plan"
												>
													<Edit2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</div>
								);
							})
						)}
					</div>
				</CardContent>
			</Card>

			<Dialog open={showChangePlanModal} onOpenChange={setShowChangePlanModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change User Plan</DialogTitle>
						<DialogDescription>Change the plan for {selectedUser?.name}</DialogDescription>
					</DialogHeader>

					<form onSubmit={changePlanForm.handleSubmit((data) => changePlanMutation.mutate(data))}>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>User</Label>
								<Input value={selectedUser?.email || ""} disabled />
							</div>

							<div className="space-y-2">
								<Label>Current Plan</Label>
								<div className="flex gap-2">
									<Input value={selectedUser?.planName || "No Plan"} disabled className="flex-1" />
									{selectedUser?.planExpiresAt && (
										<Input
											value={formatDate(selectedUser.planExpiresAt)}
											disabled
											className="w-40"
										/>
									)}
								</div>
							</div>

							<div className="space-y-2">
								<Label>New Plan</Label>
								<Select
									value={watchedPlanId}
									onValueChange={(value) => changePlanForm.setValue("planId", value)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select a plan" />
									</SelectTrigger>
									<SelectContent>
										{plans.map((plan) => (
											<SelectItem key={plan.planId} value={plan.planId}>
												{plan.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{watchedPlanId && watchedPlanId !== "free" && (
								<div className="space-y-2">
									<Label>Duration</Label>
									<Select
										value={watchedDuration}
										onValueChange={(value) => changePlanForm.setValue("duration", value)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{DURATION_OPTIONS.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<p className="text-xs text-muted-foreground">
										Expires: {formatDate(calculateExpiresAt(parseInt(watchedDuration, 10)))}
									</p>
								</div>
							)}
						</div>

						<DialogFooter className="mt-4">
							<Button type="button" variant="outline" onClick={() => setShowChangePlanModal(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={changePlanMutation.isPending || !watchedPlanId}>
								{changePlanMutation.isPending ? "Saving..." : "Save Changes"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={showRenewModal} onOpenChange={setShowRenewModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Renew Plan</DialogTitle>
						<DialogDescription>Extend the plan for {selectedUser?.name}</DialogDescription>
					</DialogHeader>

					<form onSubmit={renewForm.handleSubmit((data) => renewMutation.mutate(data))}>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Current Plan</Label>
								<Input value={selectedUser?.planName || ""} disabled />
							</div>

							<div className="space-y-2">
								<Label>Current Expiration</Label>
								<Input value={formatDate(selectedUser?.planExpiresAt || null)} disabled />
							</div>

							<div className="space-y-2">
								<Label>Extend By</Label>
								<Select
									value={renewForm.watch("months")}
									onValueChange={(value) => renewForm.setValue("months", value)}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{DURATION_OPTIONS.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<DialogFooter className="mt-4">
							<Button type="button" variant="outline" onClick={() => setShowRenewModal(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={renewMutation.isPending}>
								{renewMutation.isPending ? "Renewing..." : "Renew Plan"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Manage API Key</DialogTitle>
						<DialogDescription>View or update API key for {selectedUser?.name}</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						{selectedUser?.apiKey && (
							<div className="space-y-2">
								<Label>Current API Key</Label>
								<div className="flex gap-2">
									<Input
										value={selectedUser.apiKey}
										disabled
										className="flex-1 font-mono text-xs"
									/>
									<Button
										type="button"
										variant="outline"
										size="icon"
										onClick={copyApiKey}
										title="Copy API Key"
									>
										<Copy className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)}

						<div className="space-y-2">
							<Label>{selectedUser?.apiKey ? "New API Key" : "API Key"}</Label>
							<div className="flex gap-2">
								<Input
									value={apiKeyInput}
									onChange={(e) => setApiKeyInput(e.target.value)}
									placeholder="Enter or generate API key"
									className="flex-1 font-mono text-xs"
								/>
								<Button
									type="button"
									variant="outline"
									size="icon"
									onClick={generateRandomApiKey}
									title="Generate Random Key"
								>
									<Shuffle className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>

					<DialogFooter className="mt-4 gap-2">
						{selectedUser?.apiKey && (
							<Button
								type="button"
								variant="destructive"
								onClick={() => deleteApiKeyMutation.mutate()}
								disabled={deleteApiKeyMutation.isPending}
								className="mr-auto"
							>
								{deleteApiKeyMutation.isPending ? (
									"Removing..."
								) : (
									<>
										<Trash2 className="h-4 w-4 mr-2" />
										Remove Key
									</>
								)}
							</Button>
						)}
						<Button type="button" variant="outline" onClick={() => setShowApiKeyModal(false)}>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={() => updateApiKeyMutation.mutate(apiKeyInput)}
							disabled={updateApiKeyMutation.isPending || !apiKeyInput.trim()}
						>
							{updateApiKeyMutation.isPending ? "Saving..." : "Save API Key"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
