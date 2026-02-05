"use client";

import { FileText, Home, LayoutDashboard, LogIn, Mail, Menu, Shield, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface NavbarProps {
	isLoggedIn: boolean;
}

export function Navbar({ isLoggedIn }: NavbarProps) {
	const [open, setOpen] = useState(false);

	const navLinks = [
		{ href: "/privacy", label: "Privacy", icon: Shield },
		{ href: "/terms", label: "Terms", icon: FileText },
		{ href: "/contact", label: "Contact", icon: Mail },
	];

	return (
		<header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
			<div className="container mx-auto flex h-16 items-center justify-between px-4">
				<Link href="/" className="flex items-center gap-2.5">
					<div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-lg font-bold shadow-lg shadow-primary/20">
						A
					</div>
					<span className="text-lg font-semibold">API Gateway</span>
				</Link>

				<nav className="hidden md:flex items-center gap-6">
					{navLinks.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							{link.label}
						</Link>
					))}
					<div className="flex items-center gap-3 ml-4">
						{isLoggedIn ? (
							<Button asChild className="shadow-lg shadow-primary/20">
								<Link href="/dashboard">
									<LayoutDashboard className="mr-2 h-4 w-4" />
									Dashboard
								</Link>
							</Button>
						) : (
							<>
								<Button variant="ghost" asChild>
									<Link href="/login">Login</Link>
								</Button>
								<Button asChild className="shadow-lg shadow-primary/20">
									<Link href="/register">Get Started</Link>
								</Button>
							</>
						)}
					</div>
				</nav>

				<Sheet open={open} onOpenChange={setOpen}>
					<SheetTrigger asChild className="md:hidden">
						<Button variant="ghost" size="icon">
							<Menu className="h-5 w-5" />
							<span className="sr-only">Toggle menu</span>
						</Button>
					</SheetTrigger>
					<SheetContent side="right" className="w-[300px] sm:w-[340px] p-0">
						<SheetHeader className="border-b px-6 py-4">
							<SheetTitle asChild>
								<Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
									<div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-lg font-bold shadow-lg shadow-primary/20">
										A
									</div>
									<span className="text-lg font-semibold">API Gateway</span>
								</Link>
							</SheetTitle>
						</SheetHeader>

						<div className="flex flex-col h-[calc(100%-73px)]">
							<nav className="flex-1 px-4 py-6">
								<div className="space-y-1">
									<Link
										href="/"
										className="flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
										onClick={() => setOpen(false)}
									>
										<Home className="h-5 w-5" />
										<span className="font-medium">Home</span>
									</Link>
									{navLinks.map((link) => {
										const Icon = link.icon;
										return (
											<Link
												key={link.href}
												href={link.href}
												className="flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
												onClick={() => setOpen(false)}
											>
												<Icon className="h-5 w-5" />
												<span className="font-medium">{link.label}</span>
											</Link>
										);
									})}
								</div>
							</nav>

							<div className="border-t px-6 py-6 space-y-3 mt-auto">
								{isLoggedIn ? (
									<Button asChild className="w-full" size="lg" onClick={() => setOpen(false)}>
										<Link href="/dashboard">
											<LayoutDashboard className="mr-2 h-4 w-4" />
											Dashboard
										</Link>
									</Button>
								) : (
									<>
										<Button
											variant="outline"
											asChild
											className="w-full"
											size="lg"
											onClick={() => setOpen(false)}
										>
											<Link href="/login">
												<LogIn className="mr-2 h-4 w-4" />
												Login
											</Link>
										</Button>
										<Button asChild className="w-full" size="lg" onClick={() => setOpen(false)}>
											<Link href="/register">
												<UserPlus className="mr-2 h-4 w-4" />
												Get Started
											</Link>
										</Button>
									</>
								)}
							</div>
						</div>
					</SheetContent>
				</Sheet>
			</div>
		</header>
	);
}
