import { db, eq, siteSettings } from "@gate/database";
import parse from "html-react-parser";
import { Calendar, Shield } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { getSession } from "@/lib/dal";

async function getPrivacyPolicy() {
	const setting = await db.query.siteSettings.findFirst({
		where: eq(siteSettings.key, "privacy_policy"),
	});
	return {
		content: setting?.value || null,
		updatedAt: setting?.updatedAt || null,
	};
}

export default async function PrivacyPage() {
	const [data, session] = await Promise.all([getPrivacyPolicy(), getSession()]);

	const isLoggedIn = !!session?.user;

	return (
		<div className="min-h-screen bg-background">
			<Navbar isLoggedIn={isLoggedIn} />

			<main>
				<div className="relative overflow-hidden border-b bg-linear-to-b from-muted/50 to-background">
					<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
					<div className="container relative mx-auto px-4 py-16 sm:py-20 lg:py-24">
						<div className="max-w-3xl mx-auto text-center">
							<div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-6">
								<Shield className="h-8 w-8 text-primary" />
							</div>
							<h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">Privacy Policy</h1>
							<p className="text-lg text-muted-foreground">
								Your privacy is important to us. This policy explains how we collect, use, and
								protect your information.
							</p>
							{data.updatedAt && (
								<div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
									<Calendar className="h-4 w-4" />
									<span>
										Last updated:{" "}
										{new Date(data.updatedAt).toLocaleDateString("en-US", {
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
									</span>
								</div>
							)}
						</div>
					</div>
				</div>

				<div className="container mx-auto px-4 py-12 sm:py-16">
					<div className="max-w-3xl mx-auto">
						{data.content ? (
							<article className="prose prose-neutral dark:prose-invert prose-headings:scroll-mt-20 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-h2:mb-4 prose-h3:text-xl prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:not-italic prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-muted prose-li:marker:text-primary max-w-none">
								{parse(data.content)}
							</article>
						) : (
							<div className="text-center py-16">
								<div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-muted mb-6">
									<Shield className="h-8 w-8 text-muted-foreground" />
								</div>
								<h2 className="text-xl font-semibold mb-2">Privacy Policy Coming Soon</h2>
								<p className="text-muted-foreground max-w-md mx-auto">
									Our privacy policy is being prepared. Please check back later or contact us for
									more information.
								</p>
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
