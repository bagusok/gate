"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectProps {
	value: string;
	onValueChange: (value: string) => void;
	children: React.ReactNode;
	placeholder?: string;
}

interface SelectContextValue {
	value: string;
	onValueChange: (value: string) => void;
	open: boolean;
	setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

export function Select({ value, onValueChange, children }: SelectProps) {
	const [open, setOpen] = React.useState(false);

	return (
		<SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
			<div className="relative">{children}</div>
		</SelectContext.Provider>
	);
}

export function SelectTrigger({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	const context = React.useContext(SelectContext);
	if (!context) throw new Error("SelectTrigger must be used within Select");

	return (
		<button
			type="button"
			onClick={() => context.setOpen(!context.open)}
			className={cn(
				"flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
				className
			)}
		>
			{children}
			<ChevronDown className="h-4 w-4 opacity-50" />
		</button>
	);
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
	const context = React.useContext(SelectContext);
	if (!context) throw new Error("SelectValue must be used within Select");

	return <span>{context.value || placeholder}</span>;
}

export function SelectContent({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	const context = React.useContext(SelectContext);
	if (!context) throw new Error("SelectContent must be used within Select");

	if (!context.open) return null;

	return (
		<>
			<button className="fixed inset-0 z-40" onClick={() => context.setOpen(false)} />
			<div
				className={cn(
					"absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95",
					className
				)}
			>
				{children}
			</div>
		</>
	);
}

interface SelectItemProps {
	value: string;
	children: React.ReactNode;
	className?: string;
}

export function SelectItem({ value, children, className }: SelectItemProps) {
	const context = React.useContext(SelectContext);
	if (!context) throw new Error("SelectItem must be used within Select");

	return (
		<button
			onClick={() => {
				context.onValueChange(value);
				context.setOpen(false);
			}}
			className={cn(
				"relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
				context.value === value && "bg-accent",
				className
			)}
		>
			{children}
		</button>
	);
}
