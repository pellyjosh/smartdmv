// src/components/tenant/TenantDashboard.tsx
"use client";

import { useState, useEffect } from "react";

interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalPractices: number;
  storageUsed: string;
  monthlyGrowth: number;
}

export default function TenantDashboard() {
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/owner/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-300 rounded-md"></div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
                    <div className="h-6 bg-gray-300 rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500">Failed to load dashboard statistics.</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Tenants",
      value: stats.totalTenants,
      icon: "🏢",
      color: "bg-blue-500",
    },
    {
      title: "Active Tenants",
      value: stats.activeTenants,
      icon: "✅",
      color: "bg-green-500",
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: "👥",
      color: "bg-purple-500",
    },
    {
      title: "Total Practices",
      value: stats.totalPractices,
      icon: "🏥",
      color: "bg-indigo-500",
    },
    {
      title: "Storage Used",
      value: stats.storageUsed,
      icon: "💾",
      color: "bg-yellow-500",
    },
    {
      title: "Monthly Growth",
      value: `${stats.monthlyGrowth}%`,
      icon: "📈",
      color: "bg-pink-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div
                    className={`w-8 h-8 ${stat.color} rounded-md flex items-center justify-center`}
                  >
                    <span className="text-white text-sm">{stat.icon}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.title}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Chart Placeholder */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Tenant Activity Overview
        </h3>
        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Chart visualization coming soon</p>
        </div>
      </div>
    </div>
  );
}
