import { AlertTriangle, Check, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getAllPlans, getUserSubscription, verifySession } from "@/lib/dal";

const planFeatures: Record<string, string[]> = {
	free: ["100 requests/day", "1 API key", "Basic support", "3 days log retention"],
	pro: [
		"2,000 requests/day",
		"1 API key",
		"Priority support",
		"7 days log retention",
		"Webhook notifications",
	],
	ultra: [
		"10,000 requests/day",
		"1 API key",
		"Premium support",
		"30 days log retention",
		"Webhook notifications",
		"Custom rate limits",
	],
	enterprise: [
		"48,000 requests/day",
		"1 API key",
		"24/7 dedicated support",
		"90 days log retention",
		"All features",
		"SLA guarantee",
	],
};

function formatDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function getExpirationInfo(expiresAt: Date | null, planId: string | null) {
	if (planId === "free" || !expiresAt) {
		return { text: "No expiration", status: "none" as const };
	}

	const now = new Date();
	const daysUntil = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

	if (daysUntil < 0) {
		return { text: "Expired", status: "expired" as const };
	}
	if (daysUntil <= 7) {
		return {
			text: `Expires in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
			status: "warning" as const,
		};
	}
	return { text: `Expires ${formatDate(expiresAt)}`, status: "active" as const };
}

export default async function SubscriptionPage() {
	const session = await verifySession();
	const currentSubscription = await getUserSubscription(session.user.id);
	const allPlans = await getAllPlans();

	const currentPlanId = currentSubscription?.planId || "free";
	const expiresAt = currentSubscription?.planExpiresAt || null;
	const expirationInfo = getExpirationInfo(expiresAt, currentPlanId);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Subscription</h1>
				<p className="text-muted-foreground">Manage your subscription and billing</p>
			</div>

			{currentPlanId !== "free" && expiresAt && (
				<Card
					className={
						expirationInfo.status === "expired"
							? "border-red-500 bg-red-50"
							: expirationInfo.status === "warning"
								? "border-yellow-500 bg-yellow-50"
								: ""
					}
				>
					<CardContent className="flex items-center gap-3 pt-6">
						{expirationInfo.status === "expired" ? (
							<AlertTriangle className="h-5 w-5 text-red-500" />
						) : expirationInfo.status === "warning" ? (
							<AlertTriangle className="h-5 w-5 text-yellow-600" />
						) : (
							<Clock className="h-5 w-5 text-muted-foreground" />
						)}
						<div>
							<p className="font-medium">
								{expirationInfo.status === "expired"
									? "Your plan has expired"
									: expirationInfo.status === "warning"
										? "Your plan is expiring soon"
										: "Plan expiration"}
							</p>
							<p className="text-sm text-muted-foreground">
								{expirationInfo.status === "expired"
									? "Your plan has been downgraded to Free. Contact admin to renew."
									: `Your ${currentSubscription?.plan?.name} plan expires on ${formatDate(expiresAt)}. Contact admin to renew.`}
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				{allPlans.map((plan) => {
					const isCurrent = plan.planId === currentPlanId;
					const features = planFeatures[plan.planId] || [
						`${plan.rateLimit} requests/${plan.rateInterval}`,
					];
					const price = plan.priceMonthly ? `$${plan.priceMonthly}` : "$0";

					return (
						<Card key={plan.planId} className={isCurrent ? "border-primary" : undefined}>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle>{plan.name}</CardTitle>
									{plan.planId === "pro" && <Badge>Popular</Badge>}
									{isCurrent && <Badge variant="secondary">Current</Badge>}
								</div>
								<CardDescription>
									{plan.rateLimit} requests/{plan.rateInterval}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<span className="text-3xl font-bold">{price}</span>
									<span className="text-muted-foreground">/month</span>
								</div>
								<ul className="space-y-2">
									{features.map((feature) => (
										<li key={feature} className="flex items-center gap-2 text-sm">
											<Check className="h-4 w-4 text-green-600" />
											{feature}
										</li>
									))}
								</ul>
							</CardContent>
							<CardFooter>
								{isCurrent ? (
									<Button className="w-full" variant="outline" disabled>
										Current Plan
									</Button>
								) : plan.purchaseLink ? (
									<Button className="w-full" asChild>
										<Link href={plan.purchaseLink} target="_blank" rel="noopener noreferrer">
											Upgrade
											<ExternalLink className="ml-2 h-4 w-4" />
										</Link>
									</Button>
								) : (
									<Button className="w-full" disabled>
										Contact Admin
									</Button>
								)}
							</CardFooter>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
