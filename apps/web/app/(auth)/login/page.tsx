"use client";

import { signIn } from "@gate/auth/client";
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

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const result = await signIn.email({ email, password });
			if (result.error) {
				setError(result.error.message || "Login failed");
			} else {
				router.push("/dashboard");
			}
		} catch {
			setError("An error occurred during login");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="border-0 shadow-xl shadow-primary/5">
			<CardHeader className="space-y-1 pb-6">
				<CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
				<CardDescription>Enter your credentials to access your account</CardDescription>
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
						<div className="flex items-center justify-between">
							<Label htmlFor="password">Password</Label>
							<Link
								href="/forgot-password"
								className="text-xs text-muted-foreground hover:text-primary transition-colors"
							>
								Forgot password?
							</Link>
						</div>
						<Input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							className="h-11"
						/>
					</div>
				</CardContent>
				<CardFooter className="flex flex-col gap-4 pt-2">
					<Button type="submit" className="w-full h-11" disabled={loading}>
						{loading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Signing in...
							</>
						) : (
							"Sign in"
						)}
					</Button>
					<p className="text-sm text-muted-foreground text-center">
						Don&apos;t have an account?{" "}
						<Link href="/register" className="font-medium text-primary hover:underline">
							Create account
						</Link>
					</p>
				</CardFooter>
			</form>
		</Card>
	);
}
