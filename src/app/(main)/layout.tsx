
import { AppSidebar } from '@/components/layout/AppSidebar';

export default function MainApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 md:ml-64 pt-16 md:pt-0"> {/* Add padding-top for mobile header */}
        {/* Add a container for consistent padding, or apply directly */}
        <div className="p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
