import { Header } from "@/components/portal/header";
import { Sidebar } from "@/components/portal/sidebar";
import { verifySession } from "@/lib/dal";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
	const session = await verifySession();
	const isAdmin = session.user.role === "admin";

	return (
		<div className="flex min-h-screen bg-muted/30">
			<Sidebar isAdmin={isAdmin} />
			<div className="flex flex-1 flex-col">
				<Header isAdmin={isAdmin} />
				<main className="flex-1 p-4 lg:p-6">{children}</main>
			</div>
		</div>
	);
}
