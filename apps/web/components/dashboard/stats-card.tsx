import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
	title: string;
	value: string | number;
	description?: string;
	icon?: React.ReactNode;
	trend?: {
		value: number;
		isPositive: boolean;
	};
}

export function StatsCard({ title, value, description, icon, trend }: StatsCardProps) {
	return (
		<Card className="overflow-hidden">
			<CardContent className="p-6">
				<div className="flex items-start justify-between">
					<div className="space-y-2">
						<p className="text-sm font-medium text-muted-foreground">{title}</p>
						<p className="text-3xl font-bold tracking-tight">{value}</p>
						{description && <p className="text-xs text-muted-foreground">{description}</p>}
						{trend && (
							<div
								className={cn(
									"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
									trend.isPositive
										? "bg-emerald-500/10 text-emerald-600"
										: "bg-red-500/10 text-red-600"
								)}
							>
								{trend.isPositive ? (
									<TrendingUp className="h-3 w-3" />
								) : (
									<TrendingDown className="h-3 w-3" />
								)}
								{Math.abs(trend.value)}%
							</div>
						)}
					</div>
					{icon && <div className="rounded-xl bg-primary/10 p-3 text-primary">{icon}</div>}
				</div>
			</CardContent>
		</Card>
	);
}
