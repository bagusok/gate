import { db, eq, inArray, plans, services, siteSettings } from "@gate/database";
import {
	ArrowRight,
	BarChart3,
	Check,
	Code2,
	ExternalLink,
	Globe,
	LayoutDashboard,
	Shield,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/dal";

async function getActiveServices() {
	const activeServices = await db.query.services.findMany({
		where: eq(services.isActive, true),
		orderBy: [services.name],
	});
	return activeServices;
}

async function getAvailablePlans() {
	const allPlans = await db.query.plans.findMany({
		orderBy: [plans.priceMonthly],
	});
	return allPlans;
}

async function getSocialLinks() {
	const keys = [
		"social_facebook",
		"social_instagram",
		"social_twitter",
		"social_whatsapp",
		"social_telegram",
	];
	const settings = await db.query.siteSettings.findMany({
		where: inArray(siteSettings.key, keys),
	});
	const result: Record<string, string | null> = {};
	for (const s of settings) {
		result[s.key] = s.value;
	}
	return result;
}

export default async function Home() {
	const [activeServices, availablePlans, session, socialLinks] = await Promise.all([
		getActiveServices(),
		getAvailablePlans(),
		getSession(),
		getSocialLinks(),
	]);

	const isLoggedIn = !!session?.user;

	return (
		<div className="min-h-screen bg-background">
			<Navbar isLoggedIn={isLoggedIn} />

			<main>
				<section className="relative overflow-hidden">
					<div className="absolute inset-0 bg-linear-to-brrom-primary/5 via-background to-primary/10" />
					<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
					<div className="container relative mx-auto px-4 py-24 sm:py-32 lg:py-40">
						<div className="max-w-3xl">
							<Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
								<Zap className="mr-1.5 h-3.5 w-3.5" />
								Powerful API Management
							</Badge>
							<h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
								One API Key.
								<span className="block text-primary">Unlimited Possibilities.</span>
							</h1>
							<p className="mt-6 text-lg text-muted-foreground sm:text-xl max-w-2xl">
								Access multiple services with a single API key. Real-time usage monitoring, flexible
								rate limits, and seamless scaling for your applications.
							</p>
							<div className="mt-10 flex flex-col gap-4 sm:flex-row">
								{isLoggedIn ? (
									<Button size="lg" asChild className="shadow-lg shadow-primary/25">
										<Link href="/dashboard">
											<LayoutDashboard className="mr-2 h-5 w-5" />
											Go to Dashboard
										</Link>
									</Button>
								) : (
									<>
										<Button size="lg" asChild className="shadow-lg shadow-primary/25">
											<Link href="/register">
												Start Free
												<ArrowRight className="ml-2 h-5 w-5" />
											</Link>
										</Button>
										<Button size="lg" variant="outline" asChild>
											<Link href="/login">View Dashboard</Link>
										</Button>
									</>
								)}
							</div>
							<div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									No credit card required
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									Free tier available
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									Cancel anytime
								</div>
							</div>
						</div>
					</div>
				</section>

				<section className="border-y bg-muted/30">
					<div className="container mx-auto px-4 py-16">
						<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
							<div className="flex items-start gap-4">
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
									<Zap className="h-6 w-6 text-primary" />
								</div>
								<div>
									<h3 className="font-semibold">Lightning Fast</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										Sub-millisecond latency with global edge network
									</p>
								</div>
							</div>
							<div className="flex items-start gap-4">
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
									<Shield className="h-6 w-6 text-primary" />
								</div>
								<div>
									<h3 className="font-semibold">Secure by Default</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										API key hashing and rate limiting built-in
									</p>
								</div>
							</div>
							<div className="flex items-start gap-4">
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
									<BarChart3 className="h-6 w-6 text-primary" />
								</div>
								<div>
									<h3 className="font-semibold">Real-time Analytics</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										Monitor usage and performance live
									</p>
								</div>
							</div>
							<div className="flex items-start gap-4">
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
									<Code2 className="h-6 w-6 text-primary" />
								</div>
								<div>
									<h3 className="font-semibold">Developer Friendly</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										Simple REST API, detailed documentation
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>

				{activeServices.length > 0 && (
					<section className="py-20 sm:py-24" id="services">
						<div className="container mx-auto px-4">
							<div className="mb-12 text-center">
								<Badge variant="outline" className="mb-4">
									Services
								</Badge>
								<h2 className="text-3xl font-bold sm:text-4xl">Available API Services</h2>
								<p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
									Access these powerful APIs through our unified gateway with a single API key
								</p>
							</div>
							<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
								{activeServices.map((service) => (
									<Card
										key={service.id}
										className="group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30"
									>
										<div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
										<CardHeader className="relative pb-4">
											<div className="flex items-start justify-between">
												<div className="flex items-center gap-3">
													<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
														<Globe className="h-5 w-5 text-primary" />
													</div>
													<div>
														<CardTitle className="text-lg">{service.name}</CardTitle>
														<code className="mt-1 block text-xs text-muted-foreground">
															/proxy{service.prefix ? `/${service.prefix}` : ""}/*
														</code>
													</div>
												</div>
												{service.docsUrl && (
													<a
														href={service.docsUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
													>
														<ExternalLink className="h-4 w-4" />
													</a>
												)}
											</div>
										</CardHeader>
										<CardContent className="relative pt-0">
											<CardDescription className="line-clamp-2 min-h-10">
												{service.description || "No description available"}
											</CardDescription>
										</CardContent>
									</Card>
								))}
							</div>
						</div>
					</section>
				)}

				<section className="border-y bg-muted/30 py-20 sm:py-24" id="pricing">
					<div className="container mx-auto px-4">
						<div className="mb-12 text-center">
							<Badge variant="outline" className="mb-4">
								Pricing
							</Badge>
							<h2 className="text-3xl font-bold sm:text-4xl">Simple, Transparent Pricing</h2>
							<p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
								Choose the plan that fits your needs. Upgrade or downgrade at any time.
							</p>
						</div>
						<div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
							{availablePlans.map((plan, index) => {
								const isFree = plan.planId === "free";
								const isPopular = index === 1 && !isFree;
								const features = (plan.features as string[]) || [];
								return (
									<Card
										key={plan.planId}
										className={`relative flex flex-col transition-all hover:shadow-lg ${
											isPopular
												? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
												: "hover:border-primary/30"
										}`}
									>
										{isPopular && (
											<div className="absolute -top-3 left-1/2 -translate-x-1/2">
												<Badge className="shadow-lg">Most Popular</Badge>
											</div>
										)}
										<CardHeader className="pb-4">
											<CardTitle className="text-xl">{plan.name}</CardTitle>
											{plan.description && (
												<CardDescription className="mt-1">{plan.description}</CardDescription>
											)}
											<div className="mt-4">
												<span className="text-4xl font-bold">
													{isFree ? "Free" : `$${plan.priceMonthly}`}
												</span>
												{!isFree && <span className="text-muted-foreground">/month</span>}
											</div>
										</CardHeader>
										<CardContent className="flex-1 pt-0">
											<ul className="space-y-3 text-sm">
												<li className="flex items-center gap-3">
													<div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
														<Check className="h-3 w-3 text-primary" />
													</div>
													<span>
														<strong>{plan.rateLimit.toLocaleString()}</strong> requests/
														{plan.rateInterval}
													</span>
												</li>
												<li className="flex items-center gap-3">
													<div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
														<Check className="h-3 w-3 text-primary" />
													</div>
													<span>All services access</span>
												</li>
												<li className="flex items-center gap-3">
													<div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
														<Check className="h-3 w-3 text-primary" />
													</div>
													<span>Usage analytics dashboard</span>
												</li>
												{features.map((feature, idx) => (
													<li key={idx} className="flex items-center gap-3">
														<div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
															<Check className="h-3 w-3 text-primary" />
														</div>
														<span>{feature}</span>
													</li>
												))}
											</ul>
											<Button
												className={`mt-6 w-full ${isPopular ? "shadow-lg shadow-primary/25" : ""}`}
												variant={isFree ? "outline" : "default"}
												asChild
											>
												<Link href="/register">{isFree ? "Start Free" : "Get Started"}</Link>
											</Button>
										</CardContent>
									</Card>
								);
							})}
						</div>
					</div>
				</section>

				<section className="py-20 sm:py-24">
					<div className="container mx-auto px-4">
						<div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary to-primary/80 px-6 py-16 text-center text-primary-foreground sm:px-12 sm:py-20">
							<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
							<div className="relative">
								<h2 className="text-3xl font-bold sm:text-4xl">Ready to Get Started?</h2>
								<p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
									Create your free account today and start using our API gateway in minutes. No
									credit card required.
								</p>
								<div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
									{isLoggedIn ? (
										<Button size="lg" variant="secondary" asChild className="shadow-xl">
											<Link href="/dashboard">
												<LayoutDashboard className="mr-2 h-5 w-5" />
												Go to Dashboard
											</Link>
										</Button>
									) : (
										<>
											<Button size="lg" variant="secondary" asChild className="shadow-xl">
												<Link href="/register">
													Create Free Account
													<ArrowRight className="ml-2 h-5 w-5" />
												</Link>
											</Button>
											<Button
												size="lg"
												variant="ghost"
												asChild
												className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
											>
												<Link href="/login">Sign In</Link>
											</Button>
										</>
									)}
								</div>
							</div>
						</div>
					</div>
				</section>
			</main>

			<footer className="border-t bg-muted/30 py-12">
				<div className="container mx-auto px-4">
					<div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
						<div className="flex items-center gap-2.5">
							<div className="h-8 w-8 rounded-lg bg-linear-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-bold shadow-lg shadow-primary/20">
								A
							</div>
							<span className="font-semibold">API Gateway</span>
						</div>
						<div className="flex items-center gap-6 text-sm text-muted-foreground">
							<Link href="/privacy" className="hover:text-foreground transition-colors">
								Privacy
							</Link>
							<Link href="/terms" className="hover:text-foreground transition-colors">
								Terms
							</Link>
							<Link href="/contact" className="hover:text-foreground transition-colors">
								Contact
							</Link>
							{isLoggedIn ? (
								<Link href="/dashboard" className="hover:text-foreground transition-colors">
									Dashboard
								</Link>
							) : (
								<>
									<Link href="/login" className="hover:text-foreground transition-colors">
										Login
									</Link>
									<Link href="/register" className="hover:text-foreground transition-colors">
										Register
									</Link>
								</>
							)}
						</div>
					</div>
					{(socialLinks.social_facebook ||
						socialLinks.social_instagram ||
						socialLinks.social_twitter ||
						socialLinks.social_whatsapp ||
						socialLinks.social_telegram) && (
						<div className="mt-6 flex justify-center gap-4">
							{socialLinks.social_facebook && (
								<a
									href={socialLinks.social_facebook}
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-foreground transition-colors"
									aria-label="Facebook"
								>
									<svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
									</svg>
								</a>
							)}
							{socialLinks.social_instagram && (
								<a
									href={socialLinks.social_instagram}
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-foreground transition-colors"
									aria-label="Instagram"
								>
									<svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
									</svg>
								</a>
							)}
							{socialLinks.social_twitter && (
								<a
									href={socialLinks.social_twitter}
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-foreground transition-colors"
									aria-label="Twitter"
								>
									<svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
									</svg>
								</a>
							)}
							{socialLinks.social_whatsapp && (
								<a
									href={socialLinks.social_whatsapp}
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-foreground transition-colors"
									aria-label="WhatsApp"
								>
									<svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
									</svg>
								</a>
							)}
							{socialLinks.social_telegram && (
								<a
									href={socialLinks.social_telegram}
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-foreground transition-colors"
									aria-label="Telegram"
								>
									<svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
									</svg>
								</a>
							)}
						</div>
					)}
					<div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
						© {new Date().getFullYear()} API Gateway. All rights reserved.
					</div>
				</div>
			</footer>
		</div>
	);
}
