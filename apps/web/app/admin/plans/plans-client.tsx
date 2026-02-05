"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Edit, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";

export interface PlanData {
	planId: string;
	name: string;
	description: string | null;
	rateLimit: number;
	rateInterval: string;
	reqPerMinute?: number | null;
	priceMonthly: string | null;
	features: string[];
	usersCount: number;
	purchaseLink?: string | null;
}

interface Service {
	id: string;
	name: string;
	description: string | null;
}

interface PlanService {
	serviceId: string;
	serviceName: string;
	servicePrefix: string | null;
	dailyLimit: number | null;
	monthlyLimit: number | null;
}

interface PlansClientProps {
	plans: PlanData[];
}

interface PlanFormData {
	planId: string;
	name: string;
	description: string;
	rateLimit: string;
	rateInterval: string;
	reqPerMinute: string;
	priceMonthly: string;
	purchaseLink: string;
}

export function PlansClient({ plans }: PlansClientProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showServicesModal, setShowServicesModal] = useState(false);
	const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);
	const [createFeatures, setCreateFeatures] = useState<string[]>([]);
	const [editFeatures, setEditFeatures] = useState<string[]>([]);
	const [newFeature, setNewFeature] = useState("");
	const [editNewFeature, setEditNewFeature] = useState("");

	const [newServiceId, setNewServiceId] = useState("");
	const [limitType, setLimitType] = useState<"unlimited" | "daily" | "monthly">("unlimited");
	const [limitValue, setLimitValue] = useState("");

	const { data: allServices } = useQuery({
		queryKey: ["services"],
		queryFn: async () => {
			const res = await api.api.admin.services.$get();
			const json = await res.json();
			if ("data" in json) return json.data as Service[];
			return [];
		},
		enabled: showServicesModal,
	});

	const { data: planServices, isLoading: isLoadingPlanServices } = useQuery({
		queryKey: ["plan-services", selectedPlan?.planId],
		queryFn: async () => {
			if (!selectedPlan) return [];
			const res = await api.api.admin.plans[":id"].services.$get({
				param: { id: selectedPlan.planId },
			});
			const json = await res.json();
			if ("data" in json) return json.data as PlanService[];
			return [];
		},
		enabled: !!selectedPlan && showServicesModal,
	});

	const addServiceMutation = useMutation({
		mutationFn: async () => {
			if (!selectedPlan) throw new Error("No plan selected");
			const dailyLimit = limitType === "daily" && limitValue ? parseInt(limitValue, 10) : null;
			const monthlyLimit = limitType === "monthly" && limitValue ? parseInt(limitValue, 10) : null;
			const res = await api.api.admin.plans[":id"].services.$post({
				param: { id: selectedPlan.planId },
				json: {
					serviceId: newServiceId,
					dailyLimit,
					monthlyLimit,
				},
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.error);
			return json.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["plan-services", selectedPlan?.planId] });
			toast.success("Service added successfully");
			setNewServiceId("");
			setLimitType("unlimited");
			setLimitValue("");
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const removeServiceMutation = useMutation({
		mutationFn: async (serviceId: string) => {
			if (!selectedPlan) throw new Error("No plan selected");
			const res = await api.api.admin.plans[":id"].services[":serviceId"].$delete({
				param: { id: selectedPlan.planId, serviceId },
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.error);
			return json;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["plan-services", selectedPlan?.planId] });
			toast.success("Service removed successfully");
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const createForm = useForm<PlanFormData>({
		defaultValues: {
			planId: "",
			name: "",
			description: "",
			rateLimit: "",
			rateInterval: "daily",
			reqPerMinute: "",
			priceMonthly: "",
			purchaseLink: "",
		},
	});

	const editForm = useForm<PlanFormData>({
		defaultValues: {
			planId: "",
			name: "",
			description: "",
			rateLimit: "",
			rateInterval: "daily",
			reqPerMinute: "",
			priceMonthly: "",
			purchaseLink: "",
		},
	});

	const createMutation = useMutation({
		mutationFn: async (data: PlanFormData) => {
			const response = await api.api.admin.plans.$post({
				json: {
					planId: data.planId,
					name: data.name,
					description: data.description || undefined,
					rateLimit: parseInt(data.rateLimit, 10),
					rateInterval: data.rateInterval,
					reqPerMinute: data.reqPerMinute ? parseInt(data.reqPerMinute, 10) : undefined,
					priceMonthly: data.priceMonthly || undefined,
					features: createFeatures,
					purchaseLink: data.purchaseLink || undefined,
				},
			});
			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error || "Failed to create plan");
			}
			return result.data;
		},
		onSuccess: () => {
			toast.success("Plan created successfully");
			setShowCreateModal(false);
			createForm.reset();
			setCreateFeatures([]);
			router.refresh();
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (data: PlanFormData) => {
			if (!selectedPlan) throw new Error("No plan selected");
			const response = await api.api.admin.plans[":id"].$put({
				param: { id: selectedPlan.planId },
				json: {
					name: data.name,
					description: data.description || undefined,
					rateLimit: parseInt(data.rateLimit, 10),
					rateInterval: data.rateInterval,
					reqPerMinute: data.reqPerMinute ? parseInt(data.reqPerMinute, 10) : undefined,
					priceMonthly: data.priceMonthly || undefined,
					features: editFeatures,
					purchaseLink: data.purchaseLink || undefined,
				},
			});
			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error || "Failed to update plan");
			}
			return result.data;
		},
		onSuccess: () => {
			toast.success("Plan updated successfully");
			setShowEditModal(false);
			editForm.reset();
			setEditFeatures([]);
			router.refresh();
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async () => {
			if (!selectedPlan) throw new Error("No plan selected");
			const response = await api.api.admin.plans[":id"].$delete({
				param: { id: selectedPlan.planId },
			});
			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error || "Failed to delete plan");
			}
			return result;
		},
		onSuccess: () => {
			toast.success("Plan deleted successfully");
			setShowDeleteConfirm(false);
			setSelectedPlan(null);
			router.refresh();
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const openCreateModal = () => {
		createForm.reset({
			planId: "",
			name: "",
			description: "",
			rateLimit: "",
			rateInterval: "daily",
			reqPerMinute: "",
			priceMonthly: "",
			purchaseLink: "",
		});
		setCreateFeatures([]);
		setNewFeature("");
		setShowCreateModal(true);
	};

	const openEditModal = (plan: PlanData) => {
		setSelectedPlan(plan);
		editForm.reset({
			planId: plan.planId,
			name: plan.name,
			description: plan.description || "",
			rateLimit: plan.rateLimit.toString(),
			rateInterval: plan.rateInterval,
			reqPerMinute: plan.reqPerMinute?.toString() || "",
			priceMonthly: plan.priceMonthly || "",
			purchaseLink: plan.purchaseLink || "",
		});
		setEditFeatures(plan.features || []);
		setEditNewFeature("");
		setShowEditModal(true);
	};

	const addCreateFeature = () => {
		if (newFeature.trim()) {
			setCreateFeatures([...createFeatures, newFeature.trim()]);
			setNewFeature("");
		}
	};

	const removeCreateFeature = (index: number) => {
		setCreateFeatures(createFeatures.filter((_, i) => i !== index));
	};

	const addEditFeature = () => {
		if (editNewFeature.trim()) {
			setEditFeatures([...editFeatures, editNewFeature.trim()]);
			setEditNewFeature("");
		}
	};

	const removeEditFeature = (index: number) => {
		setEditFeatures(editFeatures.filter((_, i) => i !== index));
	};

	const openDeleteConfirm = (plan: PlanData) => {
		setSelectedPlan(plan);
		setShowDeleteConfirm(true);
	};

	const openServicesModal = (plan: PlanData) => {
		setSelectedPlan(plan);
		setNewServiceId("");
		setLimitType("unlimited");
		setLimitValue("");
		setShowServicesModal(true);
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold sm:text-3xl">Plans</h1>
					<p className="text-muted-foreground">Manage subscription plans and pricing</p>
				</div>
				<Button onClick={openCreateModal} className="w-full sm:w-auto">
					<Plus className="mr-2 h-4 w-4" />
					Create Plan
				</Button>
			</div>

			<div className="grid gap-4 sm:gap-6 md:grid-cols-2">
				{plans.map((plan) => (
					<Card key={plan.planId}>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle>{plan.name}</CardTitle>
									<CardDescription>Plan ID: {plan.planId}</CardDescription>
								</div>
								<div className="flex gap-2">
									<Button variant="ghost" size="icon" onClick={() => openEditModal(plan)}>
										<Edit className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="text-destructive"
										onClick={() => openDeleteConfirm(plan)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
							{plan.description && (
								<p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
							)}
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Price</span>
									<span className="text-2xl font-bold">
										${plan.priceMonthly || "0.00"}
										<span className="text-sm font-normal text-muted-foreground">/mo</span>
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Rate Limit</span>
									<Badge variant="outline">
										{plan.rateLimit.toLocaleString()} / {plan.rateInterval}
									</Badge>
								</div>
								{plan.reqPerMinute && (
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Anti-Spam</span>
										<div className="flex gap-1">
											<Badge variant="secondary" className="text-xs">
												{plan.reqPerMinute}/m
											</Badge>
										</div>
									</div>
								)}
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Active Users</span>
									<span className="font-medium">{plan.usersCount}</span>
								</div>
								{plan.features && plan.features.length > 0 && (
									<div className="pt-2 border-t">
										<span className="text-sm text-muted-foreground">Features</span>
										<ul className="mt-2 space-y-1">
											{plan.features.map((feature, index) => (
												<li key={index} className="flex items-center gap-2 text-sm">
													<Check className="h-3 w-3 text-primary" />
													{feature}
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
							<Button
								variant="outline"
								className="w-full mt-6"
								onClick={() => openServicesModal(plan)}
							>
								Manage Services
							</Button>
						</CardContent>
					</Card>
				))}
			</div>

			<Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New Plan</DialogTitle>
						<DialogDescription>Add a new subscription plan</DialogDescription>
					</DialogHeader>

					<form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}>
						<div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
							<div className="space-y-2">
								<Label htmlFor="planId">Plan ID</Label>
								<Input
									id="planId"
									placeholder="e.g., pro, enterprise"
									{...createForm.register("planId", { required: true })}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									placeholder="e.g., Pro Tier"
									{...createForm.register("name", { required: true })}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="description">Description</Label>
								<Textarea
									id="description"
									placeholder="Brief description of the plan..."
									rows={2}
									{...createForm.register("description")}
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="rateLimit">Rate Limit</Label>
									<Input
										id="rateLimit"
										type="number"
										placeholder="1000"
										{...createForm.register("rateLimit", { required: true })}
									/>
								</div>

								<div className="space-y-2">
									<Label>Interval</Label>
									<Select
										value={createForm.watch("rateInterval")}
										onValueChange={(value) => createForm.setValue("rateInterval", value)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="hourly">Hourly</SelectItem>
											<SelectItem value="daily">Daily</SelectItem>
											<SelectItem value="monthly">Monthly</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="reqPerMinute">Req / Minute (Optional)</Label>
									<Input
										id="reqPerMinute"
										type="number"
										placeholder="600"
										{...createForm.register("reqPerMinute")}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="priceMonthly">Price (Monthly)</Label>
								<Input
									id="priceMonthly"
									placeholder="9.99"
									{...createForm.register("priceMonthly")}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="purchaseLink">Purchase Link (Optional)</Label>
								<Input
									id="purchaseLink"
									placeholder="e.g., https://wa.me/628xxx"
									{...createForm.register("purchaseLink")}
								/>
							</div>

							<div className="space-y-2">
								<Label>Features</Label>
								<div className="space-y-2">
									{createFeatures.map((feature, index) => (
										<div key={index} className="flex items-center gap-2">
											<Input value={feature} disabled className="flex-1" />
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => removeCreateFeature(index)}
											>
												<X className="h-4 w-4" />
											</Button>
										</div>
									))}
									<div className="flex items-center gap-2">
										<Input
											placeholder="e.g., Priority support"
											value={newFeature}
											onChange={(e) => setNewFeature(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													addCreateFeature();
												}
											}}
											className="flex-1"
										/>
										<Button type="button" variant="outline" size="icon" onClick={addCreateFeature}>
											<Plus className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</div>
						</div>

						<DialogFooter className="mt-4">
							<Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={createMutation.isPending}>
								{createMutation.isPending ? "Creating..." : "Create Plan"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={showEditModal} onOpenChange={setShowEditModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Plan</DialogTitle>
						<DialogDescription>Update plan details</DialogDescription>
					</DialogHeader>

					<form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))}>
						<div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
							<div className="space-y-2">
								<Label>Plan ID</Label>
								<Input value={editForm.watch("planId")} disabled />
							</div>

							<div className="space-y-2">
								<Label htmlFor="editName">Name</Label>
								<Input id="editName" {...editForm.register("name", { required: true })} />
							</div>

							<div className="space-y-2">
								<Label htmlFor="editDescription">Description</Label>
								<Textarea
									id="editDescription"
									placeholder="Brief description of the plan..."
									rows={2}
									{...editForm.register("description")}
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="editRateLimit">Rate Limit</Label>
									<Input
										id="editRateLimit"
										type="number"
										{...editForm.register("rateLimit", { required: true })}
									/>
								</div>

								<div className="space-y-2">
									<Label>Interval</Label>
									<Select
										value={editForm.watch("rateInterval")}
										onValueChange={(value) => editForm.setValue("rateInterval", value)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="hourly">Hourly</SelectItem>
											<SelectItem value="daily">Daily</SelectItem>
											<SelectItem value="monthly">Monthly</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="editReqPerMinute">Req / Minute (Optional)</Label>
									<Input
										id="editReqPerMinute"
										type="number"
										placeholder="600"
										{...editForm.register("reqPerMinute")}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="editPriceMonthly">Price (Monthly)</Label>
								<Input id="editPriceMonthly" {...editForm.register("priceMonthly")} />
							</div>

							<div className="space-y-2">
								<Label htmlFor="editPurchaseLink">Purchase Link (Optional)</Label>
								<Input
									id="editPurchaseLink"
									placeholder="e.g., https://wa.me/628xxx"
									{...editForm.register("purchaseLink")}
								/>
							</div>

							<div className="space-y-2">
								<Label>Features</Label>
								<div className="space-y-2">
									{editFeatures.map((feature, index) => (
										<div key={index} className="flex items-center gap-2">
											<Input value={feature} disabled className="flex-1" />
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => removeEditFeature(index)}
											>
												<X className="h-4 w-4" />
											</Button>
										</div>
									))}
									<div className="flex items-center gap-2">
										<Input
											placeholder="e.g., Priority support"
											value={editNewFeature}
											onChange={(e) => setEditNewFeature(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													addEditFeature();
												}
											}}
											className="flex-1"
										/>
										<Button type="button" variant="outline" size="icon" onClick={addEditFeature}>
											<Plus className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</div>
						</div>

						<DialogFooter className="mt-4">
							<Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={updateMutation.isPending}>
								{updateMutation.isPending ? "Saving..." : "Save Changes"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Plan</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete &quot;{selectedPlan?.name}&quot;? This action cannot
							be undone.
						</DialogDescription>
					</DialogHeader>

					<DialogFooter>
						<Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => deleteMutation.mutate()}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete Plan"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={showServicesModal} onOpenChange={setShowServicesModal}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Manage Services</DialogTitle>
						<DialogDescription>Configure service limits for {selectedPlan?.name}</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						<div className="space-y-4 border-b pb-6">
							<div className="space-y-2">
								<Label>Service</Label>
								<Select value={newServiceId} onValueChange={setNewServiceId}>
									<SelectTrigger>
										<SelectValue placeholder="Select service..." />
									</SelectTrigger>
									<SelectContent>
										{allServices?.map((service) => (
											<SelectItem key={service.id} value={service.id}>
												{service.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Limit Type</Label>
								<div className="flex gap-4">
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="limitType"
											checked={limitType === "unlimited"}
											onChange={() => {
												setLimitType("unlimited");
												setLimitValue("");
											}}
											className="h-4 w-4"
										/>
										<span className="text-sm">Use Plan Default</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="limitType"
											checked={limitType === "daily"}
											onChange={() => setLimitType("daily")}
											className="h-4 w-4"
										/>
										<span className="text-sm">Daily</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="limitType"
											checked={limitType === "monthly"}
											onChange={() => setLimitType("monthly")}
											className="h-4 w-4"
										/>
										<span className="text-sm">Monthly</span>
									</label>
								</div>
							</div>

							{limitType !== "unlimited" && (
								<div className="space-y-2">
									<Label>Limit Value</Label>
									<Input
										type="number"
										placeholder={`Max requests per ${limitType === "daily" ? "day" : "month"}`}
										value={limitValue}
										onChange={(e) => setLimitValue(e.target.value)}
										className="max-w-xs"
									/>
								</div>
							)}

							<Button
								onClick={() => addServiceMutation.mutate()}
								disabled={
									!newServiceId ||
									addServiceMutation.isPending ||
									(limitType !== "unlimited" && !limitValue)
								}
								className="w-full sm:w-auto"
							>
								Add Service
							</Button>
						</div>

						<div className="space-y-4">
							<h4 className="font-medium text-sm text-muted-foreground">Connected Services</h4>
							{isLoadingPlanServices ? (
								<div className="text-sm text-muted-foreground">Loading services...</div>
							) : planServices?.length === 0 ? (
								<div className="text-sm text-muted-foreground">
									No services connected. Uses plan&apos;s global limits.
								</div>
							) : (
								<div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
									{planServices?.map((ps) => (
										<div
											key={ps.serviceId}
											className="flex items-center justify-between p-3 border rounded-lg"
										>
											<div>
												<div className="font-medium">{ps.serviceName || ps.serviceId}</div>
												<div className="text-sm text-muted-foreground">
													{ps.dailyLimit
														? `${ps.dailyLimit.toLocaleString()} / day`
														: ps.monthlyLimit
															? `${ps.monthlyLimit.toLocaleString()} / month`
															: "Plan default"}
												</div>
											</div>
											<Button
												variant="ghost"
												size="icon"
												className="text-destructive"
												onClick={() => removeServiceMutation.mutate(ps.serviceId)}
												disabled={removeServiceMutation.isPending}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowServicesModal(false)}>
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
