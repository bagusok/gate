"use client";

import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
	React.useEffect(() => {
		if (open) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "unset";
		}
		return () => {
			document.body.style.overflow = "unset";
		};
	}, [open]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50">
			<button className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
			<div className="fixed inset-0 flex items-center justify-center p-4">{children}</div>
		</div>
	);
}

interface DialogContentProps {
	children: React.ReactNode;
	className?: string;
	onClose?: () => void;
}

export function DialogContent({ children, className, onClose }: DialogContentProps) {
	return (
		<button
			className={cn(
				"relative bg-card rounded-lg shadow-lg w-full max-w-md p-6 animate-in fade-in-0 zoom-in-95",
				className
			)}
			onClick={(e) => e.stopPropagation()}
		>
			{onClose && (
				<button
					onClick={onClose}
					className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
				>
					<X className="h-4 w-4" />
				</button>
			)}
			{children}
		</button>
	);
}

export function DialogHeader({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <div className={cn("space-y-1.5 mb-4", className)}>{children}</div>;
}

export function DialogTitle({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <h2 className={cn("text-lg font-semibold", className)}>{children}</h2>;
}

export function DialogDescription({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>;
}

export function DialogFooter({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <div className={cn("flex justify-end gap-2 mt-6", className)}>{children}</div>;
}
