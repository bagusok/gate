"use client";

import { signOut } from "@gate/auth/client";
import {
	Archive,
	CreditCard,
	FileText,
	Key,
	LayoutDashboard,
	LogOut,
	Menu,
	Settings,
	Shield,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navigation = [
	{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
	{ name: "API Keys", href: "/api-keys", icon: Key },
	{ name: "Request Logs", href: "/logs", icon: FileText },
	{ name: "Log Archives", href: "/log-archives", icon: Archive },
	{ name: "Subscription", href: "/subscription", icon: CreditCard },
	{ name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarContentProps {
	onNavigate?: () => void;
	isAdmin?: boolean;
}

function SidebarContent({ onNavigate, isAdmin }: SidebarContentProps) {
	const pathname = usePathname();

	const handleSignOut = async () => {
		await signOut();
		window.location.href = "/login";
	};

	return (
		<>
			<nav className="flex-1 space-y-1 p-4">
				{navigation.map((item) => {
					const isActive = pathname === item.href;
					return (
						<Link
							key={item.name}
							href={item.href}
							onClick={onNavigate}
							className={cn(
								"flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
								isActive
									? "bg-primary text-primary-foreground shadow-sm"
									: "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
							)}
						>
							<item.icon className="h-4 w-4" />
							{item.name}
						</Link>
					);
				})}

				{isAdmin && (
					<>
						<div className="my-4 border-t" />
						<Link
							href="/admin"
							onClick={onNavigate}
							className={cn(
								"flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
								pathname.startsWith("/admin")
									? "bg-primary text-primary-foreground shadow-sm"
									: "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
							)}
						>
							<Shield className="h-4 w-4" />
							Admin Dashboard
						</Link>
					</>
				)}
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
		<Link href="/dashboard" className="flex items-center gap-3 font-semibold">
			<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-sm">
				A
			</div>
			<span className="text-lg">API Portal</span>
		</Link>
	);
}

interface SidebarProps {
	isAdmin?: boolean;
}

export function Sidebar({ isAdmin }: SidebarProps) {
	return (
		<aside className="hidden lg:flex h-screen w-64 flex-col border-r bg-card/50 backdrop-blur-sm">
			<div className="flex h-16 items-center border-b px-6">
				<SidebarLogo />
			</div>
			<SidebarContent isAdmin={isAdmin} />
		</aside>
	);
}

interface MobileSidebarProps {
	isAdmin?: boolean;
}

export function MobileSidebar({ isAdmin }: MobileSidebarProps) {
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
				<SidebarContent onNavigate={() => setOpen(false)} isAdmin={isAdmin} />
			</SheetContent>
		</Sheet>
	);
}
