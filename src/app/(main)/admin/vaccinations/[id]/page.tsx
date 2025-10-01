"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  ArrowLeft,
  Edit,
  Calendar,
  User,
  MapPin,
  Pill,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

const VaccinationDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const vaccinationId = params.id as string;

  // Fetch vaccination details
  const {
    data: vaccination,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/vaccinations", vaccinationId],
    queryFn: async () => {
      const response = await fetch(`/api/vaccinations/${vaccinationId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch vaccination details");
      }
      return response.json();
    },
    enabled: !!vaccinationId,
  });

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "Not specified";
    return format(new Date(dateString), "PPP");
  };

  // Get status badge
  const getStatusBadge = (vaccination: any) => {
    const { status, nextDueDate, expirationDate } = vaccination;

    if (status === "cancelled") {
      return <Badge variant="secondary">Cancelled</Badge>;
    }

    if (status === "scheduled") {
      return <Badge variant="default">Scheduled</Badge>;
    }

    if (status === "missed") {
      return <Badge variant="destructive">Missed</Badge>;
    }

    // Check for expired or expiring soon
    if (expirationDate) {
      const expDate = new Date(expirationDate);
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      if (expDate < today) {
        return <Badge variant="destructive">Expired</Badge>;
      }

      if (expDate < thirtyDaysFromNow) {
        return (
          <Badge
            variant="outline"
            className="border-yellow-500 text-yellow-700"
          >
            Expiring Soon
          </Badge>
        );
      }
    }

    // Check for due or due soon
    if (nextDueDate) {
      const dueDate = new Date(nextDueDate);
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      if (dueDate < today) {
        return <Badge variant="destructive">Overdue for Booster</Badge>;
      }

      if (dueDate < thirtyDaysFromNow) {
        return (
          <Badge
            variant="outline"
            className="border-yellow-500 text-yellow-700"
          >
            Booster Due Soon
          </Badge>
        );
      }
    }

    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Valid
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !vaccination) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Vaccination Not Found
          </h1>
          <p className="text-muted-foreground mb-4">
            The vaccination record you're looking for doesn't exist or you don't
            have permission to view it.
          </p>
          <Link href="/admin/vaccinations">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Vaccinations
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/vaccinations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Vaccinations
            </Button>
          </Link>

          <div>
            <h1 className="text-3xl font-bold">Vaccination Details</h1>
            <p className="text-muted-foreground">
              {vaccination.pet?.name} • {vaccination.vaccineName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge(vaccination)}
          <Link href={`/admin/vaccinations/${vaccinationId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pet Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Pet Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Pet Name
              </label>
              <p className="text-lg font-semibold">{vaccination.pet?.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Species
                </label>
                <p className="capitalize">{vaccination.pet?.species}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Breed
                </label>
                <p>{vaccination.pet?.breed || "Mixed"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Age
                </label>
                <p>
                  {vaccination.pet?.dateOfBirth
                    ? `${Math.floor(
                        (Date.now() -
                          new Date(vaccination.pet.dateOfBirth).getTime()) /
                          (365.25 * 24 * 60 * 60 * 1000)
                      )} years`
                    : "Unknown"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Weight
                </label>
                <p>{vaccination.pet?.weight || "Not recorded"}</p>
              </div>
            </div>

            {vaccination.pet?.owner && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Owner
                  </label>
                  <p className="font-medium">{vaccination.pet.owner.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {vaccination.pet.owner.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {vaccination.pet.owner.phone}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Vaccination Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Vaccination Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Vaccine Name
                  </label>
                  <p className="text-lg font-semibold">
                    {vaccination.vaccineName}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Manufacturer
                  </label>
                  <p>{vaccination.manufacturer || "Not specified"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Lot Number
                    </label>
                    <p>{vaccination.lotNumber || "Not recorded"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Serial Number
                    </label>
                    <p>{vaccination.serialNumber || "Not recorded"}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Expiration Date
                  </label>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(vaccination.expirationDate)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Administration Date
                  </label>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(vaccination.administrationDate)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Next Due Date
                  </label>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(vaccination.nextDueDate)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Route
                    </label>
                    <p className="capitalize">
                      {vaccination.route || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Dose
                    </label>
                    <p>{vaccination.dose || "Not specified"}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Administration Site
                  </label>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {vaccination.administrationSite || "Not specified"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Administering Veterinarian
              </label>
              <p className="font-medium">
                {vaccination.administeringVet?.name || "Not specified"}
              </p>
              {vaccination.administeringVet?.email && (
                <p className="text-sm text-muted-foreground">
                  {vaccination.administeringVet.email}
                </p>
              )}
            </div>

            {vaccination.reactions && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Reactions Observed
                </label>
                <p className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  {vaccination.reactions}
                </p>
              </div>
            )}

            {vaccination.notes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </label>
                <p className="mt-1 p-3 bg-gray-50 border rounded-md whitespace-pre-wrap">
                  {vaccination.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vaccine Type Information */}
      {vaccination.vaccineType && (
        <Card>
          <CardHeader>
            <CardTitle>Vaccine Type Information</CardTitle>
            <CardDescription>
              Details about this vaccine type from the practice's vaccine
              library
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Vaccine Type
                </label>
                <p className="font-medium capitalize">
                  {vaccination.vaccineType.type}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Species
                </label>
                <p className="capitalize">{vaccination.vaccineType.species}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Duration of Immunity
                </label>
                <p>
                  {vaccination.vaccineType.durationOfImmunity ||
                    "Not specified"}
                </p>
              </div>
            </div>

            {vaccination.vaccineType.diseasesProtected && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Diseases Protected Against
                </label>
                <p className="mt-1">
                  {vaccination.vaccineType.diseasesProtected}
                </p>
              </div>
            )}

            {vaccination.vaccineType.sideEffects && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Common Side Effects
                </label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {vaccination.vaccineType.sideEffects}
                </p>
              </div>
            )}

            {vaccination.vaccineType.contraindications && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Contraindications
                </label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {vaccination.vaccineType.contraindications}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VaccinationDetailsPage;
