import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
	title: "API Portal - Paid Endpoint",
	description: "Manage your API keys and monitor usage",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={`${GeistSans.variable} ${GeistMono.variable}`}
		>
			<body className="font-sans antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
