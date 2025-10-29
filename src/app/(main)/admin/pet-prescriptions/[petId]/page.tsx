"use client";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Pill,
  Loader2,
  ArrowLeft,
  Edit,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Pet, Prescription } from "@/db/schema";
import {
  isVeterinarian,
  isTechnician,
  isPracticeAdministrator,
} from "@/lib/rbac-helpers";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getPetAvatarColors } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PetPrescriptionsPage() {
  const { petId } = useParams();
  const router = useRouter();

  // Ensure petId is a string (handle Next.js dynamic params)
  const petIdString = Array.isArray(petId) ? petId[0] : petId;
  const { toast } = useToast();
  const { user } = useUser();
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "active" | "completed"
  >("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchDelayRef = useRef<NodeJS.Timeout | null>(null);

  // Check permissions (extend to SUPER_ADMIN and legacy single-role users)
  const isSuperAdmin = !!(
    user &&
    ((user as any).role === "SUPER_ADMIN" ||
      (user as any).roles?.some((r: any) => r.name === "SUPER_ADMIN"))
  );
  const isPractitioner =
    isSuperAdmin ||
    isVeterinarian(user as any) ||
    isTechnician(user as any) ||
    isPracticeAdministrator(user as any);

  // While user context is still resolving, avoid prematurely showing Access Restricted
  if (user === undefined) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Fetch pet data
  const {
    data: pet,
    isLoading: isPetLoading,
    error: petError,
  } = useQuery({
    queryKey: ["pet", petIdString],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/pets/${petIdString}`);
      return await response.json();
    },
    enabled: !!petIdString,
    retry: 1,
  });

  // Fetch prescriptions
  const {
    data: prescriptionsPages,
    isLoading: isPrescriptionsLoading,
    error: prescriptionsError,
  } = useQuery({
    queryKey: [
      "prescriptions",
      "pet",
      String(petIdString),
      selectedFilter,
      debouncedSearch,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("petId", String(petIdString));
      if (selectedFilter === "active") params.set("status", "active");
      if (selectedFilter === "completed") params.set("status", "completed");

      const response = await apiRequest(
        "GET",
        `/api/prescriptions?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch prescriptions");
      return response.json();
    },
    enabled: !!petIdString,
  });

  // Flatten prescriptions data
  const prescriptions: Prescription[] = prescriptionsPages || [];

  // Filter prescriptions based on search
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((prescription) => {
      if (!debouncedSearch) return true;
      const searchTerm = debouncedSearch.toLowerCase();
      return (
        (typeof prescription.medicationName === 'string' && prescription.medicationName.toLowerCase().includes(searchTerm)) ||
        (typeof prescription.dosage === 'string' && prescription.dosage.toLowerCase().includes(searchTerm)) ||
        (typeof prescription.route === 'string' && prescription.route.toLowerCase().includes(searchTerm)) ||
        (typeof prescription.frequency === 'string' && prescription.frequency.toLowerCase().includes(searchTerm)) ||
        (typeof prescription.instructions === 'string' && prescription.instructions.toLowerCase().includes(searchTerm))
      );
    });
  }, [prescriptions, debouncedSearch]);

  // Practitioners map for name lookup
  const practiceIdForUsers: string | undefined = (user as any)?.practiceId
    ? String((user as any).practiceId)
    : undefined;
  const { data: practitioners = [] } = useQuery({
    queryKey: ["soapNotes", "practitioners", practiceIdForUsers || "none"],
    queryFn: async () => {
      if (!practiceIdForUsers) return [];
      const res = await apiRequest(
        "GET",
        `/api/users?practiceId=${practiceIdForUsers}`
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!practiceIdForUsers,
    staleTime: 1000 * 60 * 5,
  });

  const practitionerName = useCallback(
    (practitionerId: string) => {
      const match = (practitioners as any[]).find(
        (u) => String(u.id) === practitionerId
      );
      if (!match) return `Practitioner #${practitionerId}`;
      return (
        match.name ||
        match.username ||
        match.email ||
        `Practitioner #${practitionerId}`
      );
    },
    [practitioners]
  );

  // Debounce search input
  useEffect(() => {
    if (searchDelayRef.current) clearTimeout(searchDelayRef.current);
    searchDelayRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => {
      if (searchDelayRef.current) clearTimeout(searchDelayRef.current);
    };
  }, [search]);

  // Delete prescription mutation
  const deletePrescriptionMutation = useMutation({
    mutationFn: async (prescriptionId: number) => {
      return apiRequest("DELETE", `/api/prescriptions/${prescriptionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["prescriptions", "pet", petIdString]
      });
      toast({
        title: "Prescription Deleted",
        description: "The prescription has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete prescription.",
        variant: "destructive",
      });
    },
  });

  // Handle errors
  useEffect(() => {
    if (petError) {
      toast({
        title: "Error loading pet information",
        description: "Could not load the pet details. Please try again.",
        variant: "destructive",
      });
    }
  }, [petError, toast]);

  useEffect(() => {
    if (prescriptionsError) {
      toast({
        title: "Error loading prescriptions",
        description: "Could not load the pet's prescriptions. Please try again.",
        variant: "destructive",
      });
    }
  }, [prescriptionsError, toast]);

  if (!isPractitioner) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              You don't have permission to access prescriptions.
            </p>
            <Button className="mt-4" onClick={() => router.push("/")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isPetLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (petError || !pet) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load pet information. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12 border">
              {pet.photoPath ? (
                <AvatarImage
                  src={
                    pet.photoPath.startsWith("/")
                      ? pet.photoPath
                      : `/${pet.photoPath}`
                  }
                  alt={pet.name}
                />
              ) : (
                <AvatarFallback
                  className={`${getPetAvatarColors(pet.name).bg} ${
                    getPetAvatarColors(pet.name).text
                  }`}
                >
                  {pet.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">
                {pet.name}'s Prescriptions
              </h1>
              <p className="text-muted-foreground">
                {pet.species} {pet.breed ? `• ${pet.breed}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link href={`/admin/prescriptions/new?petId=${petId}`}>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              New Prescription
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Filter:</span>
          <Button
            variant={selectedFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter("all")}
          >
            All
          </Button>
          <Button
            variant={selectedFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter("active")}
          >
            Active
          </Button>
          <Button
            variant={selectedFilter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter("completed")}
          >
            Completed
          </Button>
        </div>
        <div className="flex items-center gap-2 w-full md:w-80">
          <Input
            placeholder="Search prescriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Prescriptions List */}
      {isPrescriptionsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 w-full bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : filteredPrescriptions.length > 0 ? (
        <div className="space-y-4">
          {filteredPrescriptions
            .sort(
              (a: Prescription, b: Prescription) =>
                new Date(b.dateCreated || b.createdAt).getTime() -
                new Date(a.dateCreated || a.createdAt).getTime()
            )
            .map((prescription: Prescription) => (
              <Card key={prescription.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center space-x-2">
                        <Pill className="h-4 w-4" />
                        <span>{prescription.medicationName}</span>
                        <Badge
                          variant={
                            prescription.status === "active"
                              ? "default"
                              : prescription.status === "completed"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {prescription.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Prescribed by: {practitionerName(prescription.prescribedBy)} on{" "}
                        {format(new Date(prescription.dateCreated || prescription.createdAt), "PPP")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/prescriptions/${prescription.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePrescriptionMutation.mutate(prescription.id)}
                        disabled={deletePrescriptionMutation.isPending}
                      >
                        {deletePrescriptionMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Dosage & Route
                      </h4>
                      <p className="mt-1 text-sm">
                        {prescription.dosage} - {prescription.route}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Frequency & Duration
                      </h4>
                      <p className="mt-1 text-sm">
                        {prescription.frequency} for {prescription.duration}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Quantity & Refills
                      </h4>
                      <p className="mt-1 text-sm">
                        {prescription.quantityPrescribed} prescribed,
                        {prescription.refillsAllowed} refills allowed
                      </p>
                    </div>
                    {prescription.instructions && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                          Instructions
                        </h4>
                        <p className="mt-1 text-sm">{prescription.instructions}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Prescriptions Found</h3>
            <p className="text-muted-foreground mt-2">
              {selectedFilter === "all"
                ? `${pet.name} doesn't have any prescriptions yet.`
                : "No prescriptions match the current filter."}
            </p>
            <Link href={`/admin/prescriptions/new?petId=${petId}`}>
              <Button className="mt-4">
                <Pill className="h-4 w-4 mr-2" />
                Create First Prescription
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
