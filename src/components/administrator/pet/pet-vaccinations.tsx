import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import { 
  ChevronDown,
  ChevronUp,
  Plus,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/context/UserContext";
import { isPracticeAdministrator, isVeterinarian } from '@/lib/rbac-helpers';

const PetVaccinations = ({ petId }: { petId: string | number }) => {
  const { user } = useUser();
  const [expanded, setExpanded] = useState(true);
  
  // Fetch vaccinations for the pet
  const {
    data: vaccinations,
    isLoading,
    error,
  } = useQuery({
  queryKey: ["/api/vaccinations/pet", String(petId)],
    queryFn: async () => {
  const response = await fetch(`/api/vaccinations/pet/${String(petId)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch vaccinations");
      }
      return response.json();
    },
    enabled: !!petId,
  });

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy");
  };

  // Get status of a vaccination
  const getVaccinationStatus = (vaccination: any) => {
    if (vaccination.status === "scheduled") {
      return {
        label: "Scheduled",
        className: "text-blue-600",
        icon: <Calendar className="h-4 w-4" />
      };
    }
    
    if (vaccination.status === "missed") {
      return {
        label: "Missed",
        className: "text-amber-600",
        icon: <AlertTriangle className="h-4 w-4" />
      };
    }
    
    if (vaccination.status === "cancelled") {
      return {
        label: "Cancelled",
        className: "text-gray-600",
        icon: <FileText className="h-4 w-4" />
      };
    }
    
    // For completed vaccinations, check if expired or due
    if (vaccination.status === "completed") {
      const today = new Date();
      
      if (vaccination.expirationDate && new Date(vaccination.expirationDate) < today) {
        return {
          label: "Expired",
          className: "text-red-600",
          icon: <AlertTriangle className="h-4 w-4" />
        };
      }
      
      if (vaccination.nextDueDate && new Date(vaccination.nextDueDate) < today) {
        return {
          label: "Due for Renewal",
          className: "text-amber-600",
          icon: <Calendar className="h-4 w-4" />
        };
      }
      
      // If not expired and not due, it's valid
      return {
        label: "Valid",
        className: "text-green-600",
        icon: <CheckCircle className="h-4 w-4" />
      };
    }
    
    return {
      label: "Unknown",
      className: "text-gray-600",
      icon: <FileText className="h-4 w-4" />
    };
  };

  const canManageVaccinations =
    isPracticeAdministrator(user as any) ||
    isVeterinarian(user as any);

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl">Vaccination Records</CardTitle>
            <CardDescription>
              View and manage vaccination history
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
              {canManageVaccinations && (
                <Link href={`/admin/vaccinations/add?petId=${petId}`}>
                  <Button size="sm" className="h-8 gap-1">
                    <Plus className="h-4 w-4" />
                    Add Vaccination
                  </Button>
                </Link>
              )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Error loading vaccination records</p>
            </div>
          ) : !vaccinations || vaccinations.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-2">No vaccination records found</p>
              {canManageVaccinations && (
                <Link href={`/admin/vaccinations/add?petId=${petId}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vaccination
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vaccine</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Due</TableHead>
                    {canManageVaccinations && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vaccinations.map((vaccination: any) => {
                    const status = getVaccinationStatus(vaccination);
                    
                    return (
                      <TableRow key={vaccination.id}>
                        <TableCell>
                          <div className="font-medium">{vaccination.vaccineName}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {vaccination.manufacturer ? `${vaccination.manufacturer}` : null}
                            {vaccination.lotNumber ? ` • Lot: ${vaccination.lotNumber}` : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(vaccination.administrationDate)}
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 ${status.className}`}>
                            {status.icon}
                            <span>{status.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(vaccination.nextDueDate)}
                        </TableCell>
                        {canManageVaccinations && (
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                            <Link href={`/vaccinations/${vaccination.id}`}>
                              <Button variant="ghost" size="sm">
                                Details
                              </Button>
                            </Link>
                            {vaccination.status === "completed" && (
                              <Link href={`/admin/vaccinations/certificate/${vaccination.id}`}>
                                <Button variant="outline" size="sm">
                                  Certificate
                                </Button>
                              </Link>
                            )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default PetVaccinations;
