"use client";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import {
  isAdmin,
  isPracticeAdministrator,
  isVeterinarian,
  isSuperAdmin,
} from "@/lib/rbac-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const formSchema = z.object({
  manufacturer: z.string().optional().nullable(),
  lotNumber: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  administrationDate: z.string().optional().nullable(),
  expirationDate: z.string().optional().nullable(),
  nextDueDate: z.string().optional().nullable(),
  dose: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  administrationSite: z.string().optional().nullable(),
  reactions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditVaccinationPage() {
  const params = useParams();
  const vaccinationId = params.id as string;
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();

  const canManage =
    user &&
    (isAdmin(user as any) ||
      isPracticeAdministrator(user as any) ||
      isVeterinarian(user as any) ||
      isSuperAdmin(user as any));

  const {
    data: vaccination,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/vaccinations", vaccinationId],
    queryFn: async () => {
      const res = await fetch(`/api/vaccinations/${vaccinationId}`);
      if (!res.ok) throw new Error("Failed to load vaccination");
      return res.json();
    },
    enabled: !!vaccinationId,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      manufacturer: "",
      lotNumber: "",
      serialNumber: "",
      administrationDate: "",
      expirationDate: "",
      nextDueDate: "",
      dose: "",
      route: "",
      administrationSite: "",
      reactions: "",
      notes: "",
      status: "",
    },
  });

  // Populate form once data loads
  useEffect(() => {
    if (vaccination) {
      form.reset({
        manufacturer: vaccination.manufacturer || "",
        lotNumber: vaccination.lotNumber || "",
        serialNumber: vaccination.serialNumber || "",
        administrationDate: vaccination.administrationDate
          ? format(new Date(vaccination.administrationDate), "yyyy-MM-dd")
          : "",
        expirationDate: vaccination.expirationDate
          ? format(new Date(vaccination.expirationDate), "yyyy-MM-dd")
          : "",
        nextDueDate: vaccination.nextDueDate
          ? format(new Date(vaccination.nextDueDate), "yyyy-MM-dd")
          : "",
        dose: vaccination.dose || "",
        route: vaccination.route || "",
        administrationSite: vaccination.administrationSite || "",
        reactions: vaccination.reactions || "",
        notes: vaccination.notes || "",
        status: vaccination.status || "",
      });
    }
  }, [vaccination, form]);

  async function onSubmit(values: FormValues) {
    try {
      // Clean payload: convert empty strings to null to avoid overwriting with blanks inadvertently
      const payload: Record<string, any> = {};
      Object.entries(values).forEach(([k, v]) => {
        if (v !== undefined) {
          payload[k] = v === "" ? null : v;
        }
      });
      const res = await fetch(`/api/vaccinations/${vaccinationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Update failed");
      toast({
        title: "Updated",
        description: "Vaccination updated successfully.",
      });
      router.push(`/admin/vaccinations/${vaccinationId}`);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to update",
        variant: "destructive",
      });
    }
  }

  if (userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !vaccination) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-red-600 mb-4">Failed to load vaccination.</p>
        <Link href="/admin/vaccinations">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">
          You do not have permission to edit vaccinations.
        </p>
        <Link href={`/admin/vaccinations/${vaccinationId}`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/vaccinations/${vaccinationId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Edit Vaccination</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Vaccination Record</CardTitle>
          <CardDescription>Update vaccination details below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Manufacturer</label>
                <Input {...form.register("manufacturer")} />
              </div>
              <div>
                <label className="text-sm font-medium">Lot Number</label>
                <Input {...form.register("lotNumber")} />
              </div>
              <div>
                <label className="text-sm font-medium">Serial Number</label>
                <Input {...form.register("serialNumber")} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Administration Date
                </label>
                <Input type="date" {...form.register("administrationDate")} />
              </div>
              <div>
                <label className="text-sm font-medium">Expiration Date</label>
                <Input type="date" {...form.register("expirationDate")} />
              </div>
              <div>
                <label className="text-sm font-medium">Next Due Date</label>
                <Input type="date" {...form.register("nextDueDate")} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Dose</label>
                <Input {...form.register("dose")} />
              </div>
              <div>
                <label className="text-sm font-medium">Route</label>
                <Input {...form.register("route")} />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Administration Site
                </label>
                <Input {...form.register("administrationSite")} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  className="border rounded-md h-9 px-2 w-full text-sm"
                  {...form.register("status")}
                  defaultValue={form.getValues("status") || ""}
                >
                  <option value="">(unchanged)</option>
                  <option value="valid">Valid</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="missed">Missed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium flex items-center justify-between">
                  Reactions{" "}
                  <span className="text-xs text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <Textarea rows={4} {...form.register("reactions")} />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center justify-between">
                  Notes{" "}
                  <span className="text-xs text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <Textarea rows={4} {...form.register("notes")} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(`/admin/vaccinations/${vaccinationId}`)
                }
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
