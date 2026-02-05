"use client";

import { useMutation } from "@tanstack/react-query";
import { Edit, ExternalLink, Globe, Plus, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";

export interface ServiceData {
	id: string;
	name: string;
	description: string | null;
	baseUrl: string;
	prefix: string | null;
	docsUrl: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

interface ServicesClientProps {
	services: ServiceData[];
}

interface ServiceFormData {
	name: string;
	description: string;
	baseUrl: string;
	prefix: string;
	docsUrl: string;
	isActive: boolean;
}

export function ServicesClient({ services }: ServicesClientProps) {
	const router = useRouter();
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [selectedService, setSelectedService] = useState<ServiceData | null>(null);

	const createForm = useForm<ServiceFormData>({
		defaultValues: {
			name: "",
			description: "",
			baseUrl: "",
			prefix: "",
			docsUrl: "",
			isActive: true,
		},
	});

	const editForm = useForm<ServiceFormData>({
		defaultValues: {
			name: "",
			description: "",
			baseUrl: "",
			prefix: "",
			docsUrl: "",
			isActive: true,
		},
	});

	const createMutation = useMutation({
		mutationFn: async (data: ServiceFormData) => {
			const response = await api.api.admin.services.$post({
				json: {
					name: data.name,
					description: data.description || undefined,
					baseUrl: data.baseUrl,
					prefix: data.prefix || undefined,
					docsUrl: data.docsUrl || undefined,
				},
			});
			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error || "Failed to create service");
			}
			return result.data;
		},
		onSuccess: () => {
			toast.success("Service created successfully");
			setShowCreateModal(false);
			createForm.reset();
			router.refresh();
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (data: ServiceFormData) => {
			if (!selectedService) throw new Error("No service selected");
			const response = await api.api.admin.services[":id"].$put({
				param: { id: selectedService.id },
				json: {
					name: data.name,
					description: data.description || undefined,
					baseUrl: data.baseUrl,
					prefix: data.prefix || undefined,
					docsUrl: data.docsUrl || undefined,
					isActive: data.isActive,
				},
			});
			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error || "Failed to update service");
			}
			return result.data;
		},
		onSuccess: () => {
			toast.success("Service updated successfully");
			setShowEditModal(false);
			editForm.reset();
			router.refresh();
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async () => {
			if (!selectedService) throw new Error("No service selected");
			const response = await api.api.admin.services[":id"].$delete({
				param: { id: selectedService.id },
			});
			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error || "Failed to delete service");
			}
			return result;
		},
		onSuccess: () => {
			toast.success("Service deleted successfully");
			setShowDeleteConfirm(false);
			setSelectedService(null);
			router.refresh();
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const openCreateModal = () => {
		createForm.reset({
			name: "",
			description: "",
			baseUrl: "",
			prefix: "",
			docsUrl: "",
			isActive: true,
		});
		setShowCreateModal(true);
	};

	const openEditModal = (service: ServiceData) => {
		setSelectedService(service);
		editForm.reset({
			name: service.name,
			description: service.description || "",
			baseUrl: service.baseUrl,
			prefix: service.prefix || "",
			docsUrl: service.docsUrl || "",
			isActive: service.isActive,
		});
		setShowEditModal(true);
	};

	const openDeleteConfirm = (service: ServiceData) => {
		setSelectedService(service);
		setShowDeleteConfirm(true);
	};

	const getProxyUrl = (prefix: string | null) => {
		if (!prefix) return "/proxy/*";
		return `/proxy/${prefix}/*`;
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold sm:text-3xl">Services</h1>
					<p className="text-muted-foreground">Manage API services and upstream endpoints</p>
				</div>
				<Button onClick={openCreateModal} className="w-full sm:w-auto">
					<Plus className="mr-2 h-4 w-4" />
					Add Service
				</Button>
			</div>

			{services.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Globe className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-medium mb-2">No services configured</h3>
						<p className="text-muted-foreground text-center mb-4">
							Add your first API service to start proxying requests
						</p>
						<Button onClick={openCreateModal}>
							<Plus className="mr-2 h-4 w-4" />
							Add Service
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 sm:gap-6 md:grid-cols-2">
					{services.map((service) => (
						<Card key={service.id} className={!service.isActive ? "opacity-60" : ""}>
							<CardHeader>
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<CardTitle className="truncate">{service.name}</CardTitle>
											{service.isActive ? (
												<Badge variant="default" className="bg-green-600">
													Active
												</Badge>
											) : (
												<Badge variant="secondary">Inactive</Badge>
											)}
										</div>
										<CardDescription className="mt-1 line-clamp-2">
											{service.description || "No description"}
										</CardDescription>
									</div>
									<div className="flex gap-1 shrink-0">
										<Button variant="ghost" size="icon" onClick={() => openEditModal(service)}>
											<Edit className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="text-destructive"
											onClick={() => openDeleteConfirm(service)}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									<div>
										<p className="text-xs text-muted-foreground mb-1">Base URL</p>
										<code className="text-sm bg-muted px-2 py-1 rounded block truncate">
											{service.baseUrl}
										</code>
									</div>
									<div>
										<p className="text-xs text-muted-foreground mb-1">Proxy Path</p>
										<code className="text-sm bg-primary/10 text-primary px-2 py-1 rounded block">
											{getProxyUrl(service.prefix)}
										</code>
									</div>
									{service.docsUrl && (
										<a
											href={service.docsUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
										>
											<ExternalLink className="h-3 w-3" />
											Documentation
										</a>
									)}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			<Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Add New Service</DialogTitle>
						<DialogDescription>Configure a new API service endpoint</DialogDescription>
					</DialogHeader>

					<form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="name">Service Name *</Label>
								<Input
									id="name"
									placeholder="e.g., Game ID Checker"
									{...createForm.register("name", { required: true })}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="description">Description</Label>
								<Textarea
									id="description"
									placeholder="Brief description of what this service does"
									rows={2}
									{...createForm.register("description")}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="baseUrl">Base URL *</Label>
								<Input
									id="baseUrl"
									placeholder="e.g., https://cekid.bagusok.dev"
									{...createForm.register("baseUrl", { required: true })}
								/>
								<p className="text-xs text-muted-foreground">
									The upstream API URL to proxy requests to
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="prefix">URL Prefix</Label>
								<Input id="prefix" placeholder="e.g., game-id" {...createForm.register("prefix")} />
								<p className="text-xs text-muted-foreground">
									Optional. If set, requests to <code>/proxy/[prefix]/*</code> will route to this
									service. If empty, requests to <code>/proxy/*</code> will use this as default.
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="docsUrl">Documentation URL</Label>
								<Input
									id="docsUrl"
									placeholder="e.g., https://docs.example.com"
									{...createForm.register("docsUrl")}
								/>
							</div>
						</div>

						<DialogFooter className="mt-6">
							<Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={createMutation.isPending}>
								{createMutation.isPending ? "Creating..." : "Create Service"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={showEditModal} onOpenChange={setShowEditModal}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Edit Service</DialogTitle>
						<DialogDescription>Update service configuration</DialogDescription>
					</DialogHeader>

					<form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))}>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="editName">Service Name *</Label>
								<Input id="editName" {...editForm.register("name", { required: true })} />
							</div>

							<div className="space-y-2">
								<Label htmlFor="editDescription">Description</Label>
								<Textarea id="editDescription" rows={2} {...editForm.register("description")} />
							</div>

							<div className="space-y-2">
								<Label htmlFor="editBaseUrl">Base URL *</Label>
								<Input id="editBaseUrl" {...editForm.register("baseUrl", { required: true })} />
							</div>

							<div className="space-y-2">
								<Label htmlFor="editPrefix">URL Prefix</Label>
								<Input id="editPrefix" {...editForm.register("prefix")} />
							</div>

							<div className="space-y-2">
								<Label htmlFor="editDocsUrl">Documentation URL</Label>
								<Input id="editDocsUrl" {...editForm.register("docsUrl")} />
							</div>

							<div className="flex items-center justify-between rounded-lg border p-3">
								<div>
									<Label htmlFor="editIsActive" className="cursor-pointer">
										Active
									</Label>
									<p className="text-xs text-muted-foreground">
										Inactive services won&apos;t accept proxy requests
									</p>
								</div>
								<Switch
									id="editIsActive"
									checked={editForm.watch("isActive")}
									onCheckedChange={(checked: boolean) => editForm.setValue("isActive", checked)}
								/>
							</div>
						</div>

						<DialogFooter className="mt-6">
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
						<DialogTitle>Delete Service</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete &quot;{selectedService?.name}&quot;? This action
							cannot be undone.
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
							{deleteMutation.isPending ? "Deleting..." : "Delete Service"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
