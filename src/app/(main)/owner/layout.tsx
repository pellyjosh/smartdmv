// src/app/(main)/owner/layout.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Owner Dashboard - SmartDMV',
  description: 'Platform owner management dashboard',
};

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="owner-dashboard">
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-md">
          <div className="p-6">
            <h1 className="text-xl font-bold text-gray-800">Owner Dashboard</h1>
          </div>
          <nav className="mt-6">
            <ul className="space-y-2">
              <li>
                <a 
                  href="/owner" 
                  className="block px-6 py-3 text-gray-700 hover:bg-gray-100"
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a 
                  href="/owner/companies" 
                  className="block px-6 py-3 text-gray-700 hover:bg-gray-100"
                >
                  Companies
                </a>
              </li>
              <li>
                <a 
                  href="/owner/subscriptions" 
                  className="block px-6 py-3 text-gray-700 hover:bg-gray-100"
                >
                  Subscriptions
                </a>
              </li>
              <li>
                <a 
                  href="/owner/billing" 
                  className="block px-6 py-3 text-gray-700 hover:bg-gray-100"
                >
                  Billing
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
