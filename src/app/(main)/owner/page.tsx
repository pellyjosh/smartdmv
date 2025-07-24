// src/app/(main)/owner/page.tsx
'use client';

import { useEffect, useState } from 'react';

interface DashboardStats {
  totalCompanies: number;
  activeSubscriptions: number;
  trialAccounts: number;
  monthlyRevenue: number;
}

export default function OwnerDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    activeSubscriptions: 0,
    trialAccounts: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        // This would call your API endpoints to get real stats
        // For now, showing placeholder data
        setStats({
          totalCompanies: 12,
          activeSubscriptions: 8,
          trialAccounts: 4,
          monthlyRevenue: 2400,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
        <p className="text-gray-600 mt-2">Platform overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Companies</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalCompanies}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Active Subscriptions</h3>
          <p className="text-3xl font-bold text-green-600">{stats.activeSubscriptions}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Trial Accounts</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats.trialAccounts}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Monthly Revenue</h3>
          <p className="text-3xl font-bold text-blue-600">${stats.monthlyRevenue}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/owner/companies"
            className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Manage Companies</h3>
            <p className="text-sm text-gray-600 mt-1">View and manage all veterinary practices</p>
          </a>
          
          <a
            href="/owner/subscriptions"
            className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Subscription Management</h3>
            <p className="text-sm text-gray-600 mt-1">Handle billing and subscriptions</p>
          </a>
          
          <a
            href="/owner/analytics"
            className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Analytics</h3>
            <p className="text-sm text-gray-600 mt-1">View platform analytics and reports</p>
          </a>
        </div>
      </div>
    </div>
  );
}
