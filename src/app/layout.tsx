import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import ConditionalProviders from "@/components/providers/ConditionalProviders";
import { PWAInitializer } from "@/components/pwa/PWAInitializer";

export const metadata: Metadata = {
  title: "SmartDVM",
  description: "Your trusted partner in pet health management.",
  manifest: "/pwa/manifest.json",
  themeColor: "#2563eb",
  viewport:
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SmartDVM",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="antialiased">
        <PWAInitializer />
        <ReactQueryProvider>
          <ConditionalProviders>{children}</ConditionalProviders>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
