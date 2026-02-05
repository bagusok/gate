import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
	const session = await getSession();

	if (session?.user) {
		redirect("/dashboard");
	}

	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
			<header className="flex h-16 items-center px-4 lg:px-6">
				<Link href="/" className="flex items-center gap-2 font-semibold">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
						A
					</div>
					<span className="text-lg">API Portal</span>
				</Link>
			</header>
			<main className="flex flex-1 items-center justify-center px-4 py-8">
				<div className="w-full max-w-md">{children}</div>
			</main>
		</div>
	);
}
