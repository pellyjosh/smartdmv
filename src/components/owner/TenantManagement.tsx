"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2, Trash2, Plus } from "lucide-react";

interface Tenant {
  id: number;
  name: string;
  subdomain: string;
  customDomain?: string;
  status: string;
  plan: string;
  createdAt: string;
  dbName: string;
}

export function TenantManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    tenant: Tenant | null;
  }>({ open: false, tenant: null });
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    subdomain: "",
    customDomain: "",
    plan: "BASIC",
    superUserEmail: "",
    superUserPassword: "",
    superUserName: "",
  });

  // Load tenants
  const loadTenants = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/owner/tenants");
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (error) {
      console.error("Failed to load tenants:", error);
      toast({
        title: "Error",
        description: "Failed to load tenants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create tenant
  const createTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch("/api/owner/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success!",
          description: `Tenant "${formData.name}" created successfully!`,
        });

        // Reset form and refresh list
        setFormData({
          name: "",
          subdomain: "",
          customDomain: "",
          plan: "BASIC",
          superUserEmail: "",
          superUserPassword: "",
          superUserName: "",
        });
        setShowForm(false);
        await loadTenants();

        // Show test URL
        toast({
          title: "Test URL Ready",
          description: `Visit http://${formData.subdomain}.localhost:9002 to test`,
          duration: 10000,
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create tenant",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to create tenant:", error);
      toast({
        title: "Error",
        description: "Failed to create tenant",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Delete tenant
  const handleDeleteClick = (tenant: Tenant) => {
    setDeleteDialog({ open: true, tenant });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.tenant) return;

    const { id, name } = deleteDialog.tenant;
    setDeleting(id);

    try {
      const response = await fetch(`/api/owner/tenants?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success!",
          description: data.message,
        });

        // Refresh tenant list
        await loadTenants();
        setDeleteDialog({ open: false, tenant: null });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete tenant",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to delete tenant:", error);
      toast({
        title: "Error",
        description: "Failed to delete tenant",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialog({ open: false, tenant: null });
  };

  // Load tenants on mount
  useEffect(() => {
    loadTenants();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tenant Management</h2>
        <Button onClick={() => setShowForm(!showForm)} disabled={creating}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tenant
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Tenant</CardTitle>
            <CardDescription>
              Create a new tenant organization with its own database and
              subdomain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createTenant} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Acme Veterinary Clinic"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="subdomain">Subdomain</Label>
                  <Input
                    id="subdomain"
                    value={formData.subdomain}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        subdomain: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, ""),
                      }))
                    }
                    placeholder="acme-vet"
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Will be accessible at: {formData.subdomain || "subdomain"}
                    .localhost:9002
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customDomain">Custom Domain (Optional)</Label>
                  <Input
                    id="customDomain"
                    value={formData.customDomain}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customDomain: e.target.value,
                      }))
                    }
                    placeholder="acme-vet.com"
                  />
                </div>
                <div>
                  <Label htmlFor="plan">Plan</Label>
                  <Select
                    value={formData.plan}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, plan: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BASIC">Basic</SelectItem>
                      <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                      <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Super User Account</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="superUserName">Super User Name</Label>
                    <Input
                      id="superUserName"
                      value={formData.superUserName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          superUserName: e.target.value,
                        }))
                      }
                      placeholder="Admin User"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="superUserEmail">Super User Email</Label>
                    <Input
                      id="superUserEmail"
                      type="email"
                      value={formData.superUserEmail}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          superUserEmail: e.target.value,
                        }))
                      }
                      placeholder="admin@acme-vet.com"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="superUserPassword">Super User Password</Label>
                  <Input
                    id="superUserPassword"
                    type="password"
                    value={formData.superUserPassword}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        superUserPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter a secure password"
                    required
                    minLength={8}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    This user will have full administrative access to the tenant
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create Tenant
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Existing Tenants</CardTitle>
          <CardDescription>Manage your tenant organizations</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : tenants.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No tenants created yet. Create your first tenant to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{tenant.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Subdomain: {tenant.subdomain}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Database: {tenant.dbName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded ${
                          tenant.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : tenant.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {tenant.status}
                      </span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {tenant.plan}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `http://${tenant.subdomain}.localhost:9002`,
                          "_blank"
                        )
                      }
                    >
                      Open Tenant Site
                    </Button>
                    <Button variant="outline" size="sm">
                      Settings
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(tenant)}
                      disabled={deleting === tenant.id}
                    >
                      {deleting === tenant.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      {deleting === tenant.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && cancelDelete()}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Tenant
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                "{deleteDialog.tenant?.name}"
              </span>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <h4 className="font-medium text-destructive mb-2">
                This will permanently delete:
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• The tenant database and all data</li>
                <li>• All uploaded files and storage</li>
                <li>• All user accounts and settings</li>
              </ul>
              <p className="text-sm font-medium text-destructive mt-3">
                This action cannot be undone!
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelDelete}
              disabled={deleting !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting !== null}
            >
              {deleting === deleteDialog.tenant?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Tenant
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
