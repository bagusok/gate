"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api-client";

export interface UserData {
	id: string;
	name: string;
	email: string;
	image: string | null;
	role: string | null;
	createdAt: Date | null;
}

interface SettingsClientProps {
	user: UserData;
}

export function SettingsClient({ user }: SettingsClientProps) {
	const [name, setName] = useState(user.name);
	const [savingProfile, setSavingProfile] = useState(false);
	const [profileSuccess, setProfileSuccess] = useState(false);
	const [profileError, setProfileError] = useState("");

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [savingPassword, setSavingPassword] = useState(false);
	const [passwordSuccess, setPasswordSuccess] = useState(false);
	const [passwordError, setPasswordError] = useState("");

	const handleSaveProfile = async () => {
		setSavingProfile(true);
		setProfileError("");
		setProfileSuccess(false);
		try {
			const response = await api.api.user.profile.$put({
				json: { name },
			});
			const result = await response.json();
			if ("error" in result) {
				setProfileError(result.error);
			} else {
				setProfileSuccess(true);
				setTimeout(() => setProfileSuccess(false), 3000);
			}
		} catch {
			setProfileError("Failed to update profile");
		} finally {
			setSavingProfile(false);
		}
	};

	const handleChangePassword = async () => {
		setPasswordError("");
		setPasswordSuccess(false);

		if (newPassword !== confirmPassword) {
			setPasswordError("Passwords do not match");
			return;
		}

		if (newPassword.length < 8) {
			setPasswordError("New password must be at least 8 characters");
			return;
		}

		setSavingPassword(true);
		try {
			const response = await api.api.user.password.$put({
				json: { currentPassword, newPassword },
			});
			const result = await response.json();
			if ("error" in result) {
				setPasswordError(result.error);
			} else {
				setPasswordSuccess(true);
				setCurrentPassword("");
				setNewPassword("");
				setConfirmPassword("");
				setTimeout(() => setPasswordSuccess(false), 3000);
			}
		} catch {
			setPasswordError("Failed to change password");
		} finally {
			setSavingPassword(false);
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Settings</h1>
				<p className="text-muted-foreground">Manage your account settings</p>
			</div>

			<div className="grid gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Profile</CardTitle>
						<CardDescription>Update your personal information</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{profileError && (
							<div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
								<AlertCircle className="h-4 w-4 shrink-0" />
								{profileError}
							</div>
						)}
						{profileSuccess && (
							<div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
								<Check className="h-4 w-4 shrink-0" />
								Profile updated successfully
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input id="email" type="email" value={user.email} disabled className="bg-muted" />
							<p className="text-xs text-muted-foreground">Email cannot be changed</p>
						</div>
						<Button onClick={handleSaveProfile} disabled={savingProfile}>
							{savingProfile ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Saving...
								</>
							) : (
								"Save Changes"
							)}
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Password</CardTitle>
						<CardDescription>Change your password</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{passwordError && (
							<div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
								<AlertCircle className="h-4 w-4 shrink-0" />
								{passwordError}
							</div>
						)}
						{passwordSuccess && (
							<div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
								<Check className="h-4 w-4 shrink-0" />
								Password changed successfully
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="currentPassword">Current Password</Label>
							<Input
								id="currentPassword"
								type="password"
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="newPassword">New Password</Label>
							<Input
								id="newPassword"
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm New Password</Label>
							<Input
								id="confirmPassword"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
							/>
						</div>
						<Button onClick={handleChangePassword} disabled={savingPassword}>
							{savingPassword ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Updating...
								</>
							) : (
								"Update Password"
							)}
						</Button>
					</CardContent>
				</Card>

				<Card className="border-destructive">
					<CardHeader>
						<CardTitle className="text-destructive">Danger Zone</CardTitle>
						<CardDescription>Irreversible and destructive actions</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Separator />
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Delete Account</p>
								<p className="text-sm text-muted-foreground">
									Permanently delete your account and all data
								</p>
							</div>
							<Button variant="destructive">Delete Account</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
