"use client";

import { Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MobileSidebar } from "./sidebar";

interface HeaderProps {
	isAdmin?: boolean;
}

export function Header({ isAdmin }: HeaderProps) {
	return (
		<header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card/80 backdrop-blur-sm px-4 lg:px-6">
			<div className="flex items-center gap-4">
				<MobileSidebar isAdmin={isAdmin} />
				<h1 className="text-lg font-semibold lg:hidden">API Portal</h1>
			</div>

			<div className="flex items-center gap-3">
				<Button variant="ghost" size="icon" className="relative">
					<Bell className="h-5 w-5" />
					<span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
				</Button>
				<Avatar className="h-9 w-9 border-2 border-border">
					<AvatarImage src="" alt="User" />
					<AvatarFallback className="bg-primary/10 text-primary font-medium">U</AvatarFallback>
				</Avatar>
			</div>
		</header>
	);
}
