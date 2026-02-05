"use client";

import { Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MobileAdminSidebar } from "./sidebar";

export function AdminHeader() {
	return (
		<header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card/80 backdrop-blur-sm px-4 lg:px-6">
			<div className="flex items-center gap-4">
				<MobileAdminSidebar />
				<h1 className="text-lg font-semibold lg:hidden">Admin Panel</h1>
			</div>

			<div className="flex items-center gap-3">
				<Button variant="ghost" size="icon" className="relative">
					<Bell className="h-5 w-5" />
				</Button>
				<Avatar className="h-9 w-9 border-2 border-red-200">
					<AvatarImage src="" alt="Admin" />
					<AvatarFallback className="bg-red-100 text-red-600 font-medium">A</AvatarFallback>
				</Avatar>
			</div>
		</header>
	);
}
