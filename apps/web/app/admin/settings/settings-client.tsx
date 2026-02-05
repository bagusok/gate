"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { FileText, Headphones, Loader2, MapPin, Save, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WysiwygEditor } from "@/components/wysiwyg-editor";
import { api } from "@/lib/api-client";

interface SettingData {
	key: string;
	value: string | null;
	updatedAt: string;
}

interface SettingsFormData {
	social_facebook: string;
	social_instagram: string;
	social_twitter: string;
	social_whatsapp: string;
	social_telegram: string;
	support_email: string;
	support_phone: string;
	support_whatsapp: string;
	support_telegram: string;
	privacy_policy: string;
	terms_conditions: string;
	contact_address: string;
}

const defaultValues: SettingsFormData = {
	social_facebook: "",
	social_instagram: "",
	social_twitter: "",
	social_whatsapp: "",
	social_telegram: "",
	support_email: "",
	support_phone: "",
	support_whatsapp: "",
	support_telegram: "",
	privacy_policy: "",
	terms_conditions: "",
	contact_address: "",
};

function settingsArrayToObject(settings: SettingData[]): Partial<SettingsFormData> {
	const obj: Record<string, string> = {};
	for (const setting of settings) {
		if (setting.key in defaultValues) {
			obj[setting.key] = setting.value || "";
		}
	}
	return obj as Partial<SettingsFormData>;
}

export function SettingsClient() {
	const router = useRouter();
	const [isSaving, setIsSaving] = useState(false);

	const form = useForm<SettingsFormData>({
		defaultValues,
	});

	const {
		data: settingsData,
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["admin-settings"],
		queryFn: async () => {
			const response = await api.api.admin.settings.$get();
			const result = await response.json();
			if (!result.success) {
				throw new Error("Failed to fetch settings");
			}
			return result.data as SettingData[];
		},
	});

	useEffect(() => {
		if (settingsData) {
			const formData = settingsArrayToObject(settingsData);
			form.reset({ ...defaultValues, ...formData });
		}
	}, [settingsData, form]);

	const updateSettingMutation = useMutation({
		mutationFn: async ({ key, value }: { key: string; value: string | null }) => {
			const response = await api.api.admin.settings[":key"].$put({
				param: { key },
				json: { value },
			});
			const result = await response.json();
			if (!result.success) {
				throw new Error(`Failed to update ${key}`);
			}
			return result.data;
		},
	});

	const handleSaveAll = async (data: SettingsFormData) => {
		setIsSaving(true);
		const keys = Object.keys(data) as (keyof SettingsFormData)[];
		const dirtyFields = form.formState.dirtyFields;

		const updates = keys.filter((key) => dirtyFields[key]);

		if (updates.length === 0) {
			toast.success("No changes to save");
			setIsSaving(false);
			return;
		}

		try {
			await Promise.all(
				updates.map((key) =>
					updateSettingMutation.mutateAsync({
						key,
						value: data[key] || null,
					})
				)
			);
			toast.success(`Saved ${updates.length} setting(s)`);
			refetch();
			router.refresh();
		} catch {
			toast.error("Failed to save some settings");
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold sm:text-3xl">Site Settings</h1>
					<p className="text-muted-foreground">
						Manage site-wide settings, social links, and content
					</p>
				</div>
				<Button
					onClick={form.handleSubmit(handleSaveAll)}
					disabled={isSaving || !form.formState.isDirty}
					className="w-full sm:w-auto"
				>
					{isSaving ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Saving...
						</>
					) : (
						<>
							<Save className="mr-2 h-4 w-4" />
							Save Changes
						</>
					)}
				</Button>
			</div>

			<form onSubmit={form.handleSubmit(handleSaveAll)} className="space-y-6">
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Share2 className="h-5 w-5 text-primary" />
							<CardTitle>Social Media Links</CardTitle>
						</div>
						<CardDescription>Configure social media links displayed in the footer</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="social_facebook">Facebook</Label>
							<Input
								id="social_facebook"
								placeholder="https://facebook.com/yourpage"
								{...form.register("social_facebook")}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="social_instagram">Instagram</Label>
							<Input
								id="social_instagram"
								placeholder="https://instagram.com/yourprofile"
								{...form.register("social_instagram")}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="social_twitter">Twitter / X</Label>
							<Input
								id="social_twitter"
								placeholder="https://twitter.com/yourhandle"
								{...form.register("social_twitter")}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="social_whatsapp">WhatsApp</Label>
							<Input
								id="social_whatsapp"
								placeholder="https://wa.me/1234567890"
								{...form.register("social_whatsapp")}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="social_telegram">Telegram</Label>
							<Input
								id="social_telegram"
								placeholder="https://t.me/yourchannel"
								{...form.register("social_telegram")}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Headphones className="h-5 w-5 text-primary" />
							<CardTitle>Support Contact</CardTitle>
						</div>
						<CardDescription>Contact information for customer support</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="support_email">Support Email</Label>
							<Input
								id="support_email"
								type="email"
								placeholder="support@example.com"
								{...form.register("support_email")}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="support_phone">Support Phone</Label>
							<Input
								id="support_phone"
								placeholder="+1 234 567 8900"
								{...form.register("support_phone")}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="support_whatsapp">Support WhatsApp</Label>
							<Input
								id="support_whatsapp"
								placeholder="https://wa.me/1234567890"
								{...form.register("support_whatsapp")}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="support_telegram">Support Telegram</Label>
							<Input
								id="support_telegram"
								placeholder="https://t.me/yoursupport"
								{...form.register("support_telegram")}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<MapPin className="h-5 w-5 text-primary" />
							<CardTitle>Business Address</CardTitle>
						</div>
						<CardDescription>Physical address displayed on the contact page</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<Label htmlFor="contact_address">Address</Label>
							<Textarea
								id="contact_address"
								placeholder="123 Main Street, City, Country"
								rows={2}
								{...form.register("contact_address")}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<FileText className="h-5 w-5 text-primary" />
							<CardTitle>Legal Pages</CardTitle>
						</div>
						<CardDescription>
							Content for Privacy Policy and Terms pages with rich text editor
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="space-y-2">
							<Label>Privacy Policy</Label>
							<Controller
								name="privacy_policy"
								control={form.control}
								render={({ field }) => (
									<WysiwygEditor
										value={field.value}
										onChange={(value) => {
											field.onChange(value);
											form.setValue("privacy_policy", value, { shouldDirty: true });
										}}
										placeholder="Write your privacy policy here..."
									/>
								)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Terms and Conditions</Label>
							<Controller
								name="terms_conditions"
								control={form.control}
								render={({ field }) => (
									<WysiwygEditor
										value={field.value}
										onChange={(value) => {
											field.onChange(value);
											form.setValue("terms_conditions", value, { shouldDirty: true });
										}}
										placeholder="Write your terms and conditions here..."
									/>
								)}
							/>
						</div>
					</CardContent>
				</Card>
			</form>
		</div>
	);
}
