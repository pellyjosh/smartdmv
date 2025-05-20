
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from '@/context/UserContext'; // Import UserProvider
import { ThemeProvider } from '@/context/ThemeContext'; 
import { ThemeSwitcherWidget } from '@/components/ThemeSwitcherWidget'; 

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <UserProvider> {/* Use UserProvider */}
          <ThemeProvider>
            {/* Sidebar components are removed from here */}
            {children} {/* Children will now be rendered directly by RootLayout or by a nested layout */}
            <Toaster />
            <ThemeSwitcherWidget /> 
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}
