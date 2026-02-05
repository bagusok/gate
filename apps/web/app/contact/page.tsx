import { db, eq, siteSettings } from "@gate/database";
import { Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/dal";

async function getContactSettings() {
	const keys = [
		"support_email",
		"support_phone",
		"support_whatsapp",
		"support_telegram",
		"contact_address",
	];
	const results: Record<string, string | null> = {};

	for (const key of keys) {
		const setting = await db.query.siteSettings.findFirst({
			where: eq(siteSettings.key, key),
		});
		results[key] = setting?.value || null;
	}

	return results;
}

export default async function ContactPage() {
	const [settings, session] = await Promise.all([getContactSettings(), getSession()]);

	const isLoggedIn = !!session?.user;
	const hasAnyContact = Object.values(settings).some((v) => v);

	return (
		<div className="min-h-screen bg-background">
			<Navbar isLoggedIn={isLoggedIn} />

			<main className="py-12 sm:py-16 lg:py-20">
				<div className="container mx-auto px-4 max-w-5xl">
					<div className="text-center mb-12">
						<h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">Get in Touch</h1>
						<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
							Have questions or need assistance? We&apos;re here to help. Reach out through any of
							the channels below.
						</p>
					</div>

					{hasAnyContact ? (
						<div className="grid gap-6 sm:grid-cols-2">
							{settings.support_email && (
								<Card className="group hover:shadow-lg hover:border-primary/30 transition-all">
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-3 text-lg">
											<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
												<Mail className="h-5 w-5 text-primary" />
											</div>
											Email
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-sm text-muted-foreground mb-2">Send us an email</p>
										<a
											href={`mailto:${settings.support_email}`}
											className="text-primary font-medium hover:underline"
										>
											{settings.support_email}
										</a>
									</CardContent>
								</Card>
							)}

							{settings.support_phone && (
								<Card className="group hover:shadow-lg hover:border-primary/30 transition-all">
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-3 text-lg">
											<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
												<Phone className="h-5 w-5 text-primary" />
											</div>
											Phone
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-sm text-muted-foreground mb-2">Give us a call</p>
										<a
											href={`tel:${settings.support_phone}`}
											className="text-primary font-medium hover:underline"
										>
											{settings.support_phone}
										</a>
									</CardContent>
								</Card>
							)}

							{settings.support_whatsapp && (
								<Card className="group hover:shadow-lg hover:border-primary/30 transition-all">
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-3 text-lg">
											<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
												<MessageCircle className="h-5 w-5 text-green-600" />
											</div>
											WhatsApp
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-sm text-muted-foreground mb-2">Chat with us instantly</p>
										<a
											href={settings.support_whatsapp}
											target="_blank"
											rel="noopener noreferrer"
											className="text-green-600 font-medium hover:underline"
										>
											Start WhatsApp Chat →
										</a>
									</CardContent>
								</Card>
							)}

							{settings.support_telegram && (
								<Card className="group hover:shadow-lg hover:border-primary/30 transition-all">
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-3 text-lg">
											<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
												<Send className="h-5 w-5 text-blue-500" />
											</div>
											Telegram
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-sm text-muted-foreground mb-2">Message us on Telegram</p>
										<a
											href={settings.support_telegram}
											target="_blank"
											rel="noopener noreferrer"
											className="text-blue-500 font-medium hover:underline"
										>
											Open Telegram Chat →
										</a>
									</CardContent>
								</Card>
							)}

							{settings.contact_address && (
								<Card className="sm:col-span-2 group hover:shadow-lg hover:border-primary/30 transition-all">
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-3 text-lg">
											<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
												<MapPin className="h-5 w-5 text-primary" />
											</div>
											Our Address
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-sm text-muted-foreground mb-2">Visit us at</p>
										<p className="whitespace-pre-line text-foreground">
											{settings.contact_address}
										</p>
									</CardContent>
								</Card>
							)}
						</div>
					) : (
						<Card className="text-center py-12">
							<CardContent>
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-4">
									<Mail className="h-6 w-6 text-muted-foreground" />
								</div>
								<h3 className="text-lg font-semibold mb-2">Contact Information Coming Soon</h3>
								<p className="text-muted-foreground">
									Our contact details are being set up. Please check back later.
								</p>
							</CardContent>
						</Card>
					)}
				</div>
			</main>
		</div>
	);
}
