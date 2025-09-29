// src/components/tenant/TenantSelector.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: string;
}

export default function TenantSelector() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/owner/tenants");
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (error) {
      console.error("Error fetching tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = (tenant: Tenant) => {
    // Redirect to tenant's domain
    const domain = `${tenant.subdomain}.${window.location.hostname}`;
    window.open(`http://${domain}`, "_blank");
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Quick Access to Tenants
        </h3>
        <div className="space-y-3">
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => handleTenantSelect(tenant)}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {tenant.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {tenant.subdomain}.yourdomain.com
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    tenant.status === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {tenant.status}
                </span>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <button
            onClick={() => router.push("/owner/tenants/create")}
            className="w-full text-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Add New Tenant
          </button>
        </div>
      </div>
    </div>
  );
}
