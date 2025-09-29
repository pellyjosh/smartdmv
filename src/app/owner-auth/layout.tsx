import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - SmartDVM',
  description: 'Login to SmartDVM.',
};

export default function OwnerAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // AuthProvider is in the root layout, so it covers this.
    // This layout ensures the login page doesn't have the main app sidebar.
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}