"use client";

import { signOut } from "@gate/auth/client";
import {
	Activity,
	Archive,
	BarChart3,
	CreditCard,
	FileText,
	Globe,
	Home,
	LogOut,
	Menu,
	Settings,
	Shield,
	Users,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navigation = [
	{ name: "Dashboard", href: "/admin", icon: BarChart3 },
	{ name: "Services", href: "/admin/services", icon: Globe },
	{ name: "Users", href: "/admin/users", icon: Users },
	{ name: "Plans", href: "/admin/plans", icon: CreditCard },
	{ name: "Request Logs", href: "/admin/request-logs", icon: Activity },
	{ name: "Log Archives", href: "/admin/log-archives", icon: Archive },
	{ name: "System Logs", href: "/admin/system-logs", icon: FileText },
	{ name: "Settings", href: "/admin/settings", icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
	const pathname = usePathname();

	const handleSignOut = async () => {
		await signOut();
		window.location.href = "/login";
	};

	return (
		<>
			<nav className="flex-1 space-y-1 p-4">
				{navigation.map((item) => {
					const isActive =
						item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
					return (
						<Link
							key={item.name}
							href={item.href}
							onClick={onNavigate}
							className={cn(
								"flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
								isActive
									? "bg-red-600 text-white shadow-sm"
									: "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
							)}
						>
							<item.icon className="h-4 w-4" />
							{item.name}
						</Link>
					);
				})}

				<div className="pt-4">
					<Link
						href="/dashboard"
						onClick={onNavigate}
						className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground"
					>
						<Home className="h-4 w-4" />
						Back to Portal
					</Link>
				</div>
			</nav>

			<div className="border-t p-4">
				<Button
					variant="ghost"
					className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
					onClick={handleSignOut}
				>
					<LogOut className="h-4 w-4" />
					Sign out
				</Button>
			</div>
		</>
	);
}

function SidebarLogo() {
	return (
		<Link href="/admin" className="flex items-center gap-3 font-semibold">
			<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white font-bold shadow-sm">
				<Shield className="h-5 w-5" />
			</div>
			<span className="text-lg">Admin Panel</span>
		</Link>
	);
}

export function AdminSidebar() {
	return (
		<aside className="hidden lg:flex h-screen w-64 flex-col border-r bg-card/50 backdrop-blur-sm">
			<div className="flex h-16 items-center border-b px-6">
				<SidebarLogo />
			</div>
			<SidebarContent />
		</aside>
	);
}

export function MobileAdminSidebar() {
	const [open, setOpen] = useState(false);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" className="lg:hidden">
					<Menu className="h-5 w-5" />
					<span className="sr-only">Open menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
				<SheetHeader className="border-b px-6 py-4">
					<div className="flex items-center justify-between">
						<SheetTitle asChild>
							<SidebarLogo />
						</SheetTitle>
						<Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8">
							<X className="h-4 w-4" />
						</Button>
					</div>
				</SheetHeader>
				<SidebarContent onNavigate={() => setOpen(false)} />
			</SheetContent>
		</Sheet>
	);
}
