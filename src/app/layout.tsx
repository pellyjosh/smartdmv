import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import ConditionalProviders from "@/components/providers/ConditionalProviders";

export const metadata: Metadata = {
  title: "SmartDVM",
  description: "Your trusted partner in pet health management.",
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
        <ReactQueryProvider>
          <ConditionalProviders>{children}</ConditionalProviders>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
