"use client";

import { TenantManagement } from "@/components/owner/TenantManagement";

export default function TenantsPage() {
  return (
    <div className="container mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
        <p className="text-muted-foreground">
          Create and manage tenant accounts for your SmartDMV system.
        </p>
      </div>
      <TenantManagement />
    </div>
  );
}
