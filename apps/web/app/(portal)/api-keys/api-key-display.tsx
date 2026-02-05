"use client";

import { Check, Copy, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";

interface Plan {
	planId: string;
	name: string;
	rateLimit: number;
	rateInterval: string;
	priceMonthly: string | null;
}

interface ApiKeyDisplayProps {
	apiKey: string;
	plan: Plan | null;
}

export function ApiKeyDisplay({ apiKey: initialApiKey, plan }: ApiKeyDisplayProps) {
	const [apiKey, setApiKey] = useState(initialApiKey);
	const [copied, setCopied] = useState(false);
	const [visible, setVisible] = useState(false);
	const [generating, setGenerating] = useState(false);

	const copyToClipboard = async () => {
		await navigator.clipboard.writeText(apiKey);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const generateNewApiKey = async () => {
		setGenerating(true);
		try {
			const response = await api.api.user.apikey.generate.$post({});
			const result = await response.json();
			if ("apiKey" in result && result.apiKey) {
				setApiKey(result.apiKey);
				setVisible(true);
			}
		} finally {
			setGenerating(false);
		}
	};

	const keyPrefix = apiKey.substring(0, 12);
	const maskedKey = `${keyPrefix}${"•".repeat(20)}`;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">API Key</h1>
				<p className="text-muted-foreground">Your API key for authentication</p>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Your API Key</CardTitle>
							<CardDescription>
								Use this key to authenticate your API requests. Keep it secure!
							</CardDescription>
						</div>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="outline" disabled={generating}>
									{generating ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<RefreshCw className="mr-2 h-4 w-4" />
									)}
									Regenerate Key
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
									<AlertDialogDescription>
										This will invalidate your current API key immediately. All applications using
										the old key will stop working. This action cannot be undone.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction onClick={generateNewApiKey}>Yes, Regenerate</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-2">
						<code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">
							{visible ? apiKey : maskedKey}
						</code>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setVisible(!visible)}
							title={visible ? "Hide API Key" : "Show API Key"}
						>
							{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={copyToClipboard}
							title="Copy to clipboard"
						>
							{copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
						</Button>
					</div>

					{plan && (
						<div className="pt-4 border-t">
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">Plan:</span>
								<Badge variant="outline">{plan.name}</Badge>
								<span className="text-sm text-muted-foreground">
									({plan.rateLimit} requests/{plan.rateInterval})
								</span>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Usage Example</CardTitle>
					<CardDescription>Add your API key to the request header</CardDescription>
				</CardHeader>
				<CardContent>
					<pre className="rounded bg-muted p-4 text-sm overflow-x-auto">
						<code>{`curl -H "X-API-Key: ${visible ? apiKey : "your-api-key"}" \\
  https://api.example.com/endpoint`}</code>
					</pre>
				</CardContent>
			</Card>
		</div>
	);
}
