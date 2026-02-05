"use client";

import { ProgressProvider } from "@bprogress/next/app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
			refetchOnWindowFocus: false,
		},
	},
});

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<ProgressProvider
				height="3px"
				color="#3b82f6"
				options={{ showSpinner: false }}
				shallowRouting
			>
				{children}
			</ProgressProvider>
			<Toaster position="top-right" />
		</QueryClientProvider>
	);
}
