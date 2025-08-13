
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from '@/context/UserContext';
import ReactQueryProvider  from '@/components/providers/ReactQueryProvider';
import { ThemeProvider } from '@/context/ThemeContext'; 
import { ThemeSwitcherWidget } from '@/components/ThemeSwitcherWidget'; 
import ClientOnlyWrapper from '@/components/utils/ClientOnlyWrapper'; // Import the wrapper
import { NetworkStatus } from '@/components/NetworkStatus';

export const metadata: Metadata = {
  title: 'SmartDVM',
  description: 'Your trusted partner in pet health management.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased">
      <ReactQueryProvider>
        <UserProvider>
          <ThemeProvider>
            <ClientOnlyWrapper> {/* Wrap children with ClientOnlyWrapper */}
              {children}
            </ClientOnlyWrapper>
            <Toaster />
            <NetworkStatus />
            <ThemeSwitcherWidget /> 
          </ThemeProvider>
        </UserProvider>
      </ ReactQueryProvider>
      </body>
    </html>
  );
}
