import { AdminHeader } from "@/components/admin/header";
import { AdminSidebar } from "@/components/admin/sidebar";
import { verifyAdminSession } from "@/lib/dal";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
	await verifyAdminSession();

	return (
		<div className="flex h-screen bg-muted/30">
			<AdminSidebar />
			<div className="flex flex-1 flex-col overflow-hidden">
				<AdminHeader />
				<main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
			</div>
		</div>
	);
}
