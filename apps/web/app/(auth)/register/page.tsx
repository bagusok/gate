"use client";

import { authClient } from "@gate/auth/client";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [agreedToTerms, setAgreedToTerms] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (!agreedToTerms) {
			setError("You must agree to the Terms and Privacy Policy");
			return;
		}

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}

		setLoading(true);

		try {
			const result = await authClient.signUp.email({
				email,
				password,
				name,
			});
			if (result.error) {
				setError(result.error.message || "Registration failed");
			} else {
				router.push("/dashboard");
			}
		} catch {
			setError("An error occurred during registration");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="border-0 shadow-xl shadow-primary/5">
			<CardHeader className="space-y-1 pb-6">
				<CardTitle className="text-2xl font-bold">Create an account</CardTitle>
				<CardDescription>Enter your details to get started</CardDescription>
			</CardHeader>
			<form onSubmit={handleSubmit}>
				<CardContent className="space-y-4">
					{error && (
						<div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
							<AlertCircle className="h-4 w-4 shrink-0" />
							{error}
						</div>
					)}
					<div className="space-y-2">
						<Label htmlFor="name">Full Name</Label>
						<Input
							id="name"
							type="text"
							placeholder="John Doe"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							className="h-11"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="name@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							className="h-11"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							type="password"
							placeholder="At least 8 characters"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							className="h-11"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="confirmPassword">Confirm Password</Label>
						<Input
							id="confirmPassword"
							type="password"
							placeholder="Repeat your password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
							className="h-11"
						/>
					</div>
					<div className="flex items-start gap-3">
						<input
							type="checkbox"
							id="terms"
							checked={agreedToTerms}
							onChange={(e) => setAgreedToTerms(e.target.checked)}
							className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
						/>
						<label htmlFor="terms" className="text-sm text-muted-foreground">
							I agree to the{" "}
							<Link href="/terms" className="font-medium text-primary hover:underline">
								Terms of Service
							</Link>{" "}
							and{" "}
							<Link href="/privacy" className="font-medium text-primary hover:underline">
								Privacy Policy
							</Link>
						</label>
					</div>
				</CardContent>
				<CardFooter className="flex flex-col gap-4 pt-2">
					<Button type="submit" className="w-full h-11" disabled={loading}>
						{loading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Creating account...
							</>
						) : (
							"Create account"
						)}
					</Button>
					<p className="text-sm text-muted-foreground text-center">
						Already have an account?{" "}
						<Link href="/login" className="font-medium text-primary hover:underline">
							Sign in
						</Link>
					</p>
				</CardFooter>
			</form>
		</Card>
	);
}
