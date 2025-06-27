'use client'
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Pagination, 
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Loader2, Plus, Search, Filter, Calendar } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { format } from "date-fns";
import { UserRoleEnum } from "@/db/schema";

const VaccinationsPage = () => {
  const { user, isLoading, userPracticeId } = useUser();
  const practiceId = userPracticeId;
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all", "upcoming", "expired"
  const [speciesFilter, setSpeciesFilter] = useState("all"); // "all", "dog", "cat", etc.

  // Fetch vaccinations for the current practice
  const {
    data: vaccinations,
    isLoading: isLoadingVaccinations,
    error,
  } = useQuery({
    queryKey: ["/api/vaccinations", practiceId, activeTab],
    queryFn: async () => {
      const baseUrl = `/api/vaccinations?practiceId=${practiceId}`;
      
      // Different endpoint based on active tab
      let url = baseUrl;
      if (activeTab === "upcoming") {
        const today = new Date();
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
        
        url = `/api/vaccinations/due?practiceId=${practiceId}&startDate=${today.toISOString()}&endDate=${threeMonthsFromNow.toISOString()}`;
      } else if (activeTab === "expired") {
        const today = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        url = `/api/vaccinations/expiring?practiceId=${practiceId}&startDate=${threeMonthsAgo.toISOString()}&endDate=${today.toISOString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch vaccinations");
      }
      return response.json();
    },
    enabled: !!practiceId,
  });

  // Fetch pet details for each vaccination
  const { data: pets } = useQuery({
    queryKey: ["/api/pets", practiceId],
    queryFn: async () => {
      const response = await fetch(`/api/pets?practiceId=${practiceId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch pets");
      }
      return response.json();
    },
    enabled: !!practiceId,
  });

  // If we have an error fetching vaccinations, use useEffect to prevent infinite re-renders
  const [errorToastShown, setErrorToastShown] = useState(false);
  
  useEffect(() => {
    if (error && !errorToastShown) {
      toast({
        title: "Error",
        description: "Failed to load vaccination records. Please try again later.",
        variant: "destructive",
      });
      setErrorToastShown(true);
    }
  }, [error, errorToastShown, toast]);

  // Filter vaccinations based on search term and species filter
  const filteredVaccinations = error 
    ? []
    : vaccinations?.filter((vaccination: any) => {
      // Find the associated pet for this vaccination
      const pet = pets?.find((p: any) => p.id === vaccination.petId);
      
      // Apply species filter
      if (speciesFilter !== "all" && pet?.species.toLowerCase() !== speciesFilter) {
        return false;
      }
      
      // Apply search term filter (search by pet name or vaccine name)
      const searchLower = searchTerm.toLowerCase();
      return searchTerm === "" || 
             pet?.name.toLowerCase().includes(searchLower) ||
             vaccination.vaccineName.toLowerCase().includes(searchLower) ||
             vaccination.manufacturer?.toLowerCase().includes(searchLower) ||
             vaccination.lotNumber?.toLowerCase().includes(searchLower);
    });

  // Find pet name by ID
  const getPetName = (petId: any): string => {
    const pet = pets?.find((p: any) => p.id === petId);
    return pet ? pet.name : "Unknown Pet";
  };

  // Format date for display
  const formatDate = (dateString: any): string => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy");
  };

  // Get status badge based on vaccination status and next due date
  const getStatusBadge = (vaccination: any): JSX.Element => {
    const { status, nextDueDate, expirationDate } = vaccination;
    
    if (status === "cancelled") {
      return <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded-full text-xs">Cancelled</span>;
    }
    
    if (status === "scheduled") {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Scheduled</span>;
    }
    
    if (status === "missed") {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Missed</span>;
    }
    
    // Check for expired or expiring soon
    if (expirationDate) {
      const expDate = new Date(expirationDate);
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      if (expDate < today) {
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Expired</span>;
      }
      
      if (expDate < thirtyDaysFromNow) {
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Expiring Soon</span>;
      }
    }
    
    // Check for due or due soon
    if (nextDueDate) {
      const dueDate = new Date(nextDueDate);
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      if (dueDate < today) {
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Overdue</span>;
      }
      
      if (dueDate < thirtyDaysFromNow) {
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Due Soon</span>;
      }
    }
    
    return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Valid</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPracticeAdmin = user?.role === UserRoleEnum.PRACTICE_ADMINISTRATOR;
  const isSuperAdmin = user?.role === UserRoleEnum.SUPER_ADMIN;
  const isVet = user?.role === UserRoleEnum.VETERINARIAN;
  const canManageVaccinations = isPracticeAdmin || isSuperAdmin || isVet;

  return (
    <>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Vaccination Records</h1>
            <p className="text-muted-foreground">
              Manage and track pet vaccinations
            </p>
          </div>

          {canManageVaccinations && (
            <div className="flex gap-2">
              <Link href="/vaccinations/types">
                <Button variant="outline">
                  Manage Vaccine Types
                </Button>
              </Link>
              <Link href="/vaccinations/add">
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> 
                  Add Vaccination
                </Button>
              </Link>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vaccination Records</CardTitle>
            <CardDescription>
              View and manage vaccination records across all pets in the practice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs 
              defaultValue="all" 
              className="w-full mb-6"
              onValueChange={setActiveTab}
              value={activeTab}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All Records</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming Due</TabsTrigger>
                <TabsTrigger value="expired">Recently Expired</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col md:flex-row justify-between space-y-2 md:space-y-0 md:space-x-2 mb-6">
              <div className="relative w-full md:w-1/2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by pet name or vaccine..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <div className="w-full md:w-auto">
                  <Select 
                    value={speciesFilter} 
                    onValueChange={setSpeciesFilter}
                  >
                    <SelectTrigger className="w-full md:w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by species" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Species</SelectItem>
                      <SelectItem value="dog">Dogs</SelectItem>
                      <SelectItem value="cat">Cats</SelectItem>
                      <SelectItem value="bird">Birds</SelectItem>
                      <SelectItem value="reptile">Reptiles</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {isLoadingVaccinations ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !filteredVaccinations?.length ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-center p-4">
                <h3 className="text-lg font-medium">No vaccinations found</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  {activeTab === "all" 
                    ? "No vaccination records found. Add some vaccinations to get started."
                    : activeTab === "upcoming"
                      ? "No upcoming vaccinations due in the next 3 months."
                      : "No recently expired vaccinations in the last 3 months."}
                </p>
                {canManageVaccinations && (
                  <Link href="/vaccinations/add">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" /> Add Vaccination
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pet</TableHead>
                        <TableHead>Vaccine</TableHead>
                        <TableHead>Date Administered</TableHead>
                        <TableHead>Next Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVaccinations.map((vaccination: any) => (
                        <TableRow key={vaccination.id}>
                          <TableCell>
                            <Link href={`/pets/${vaccination.petId}`}>
                              <span className="font-medium hover:underline cursor-pointer">
                                {getPetName(vaccination.petId)}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{vaccination.vaccineName}</div>
                            <div className="text-xs text-muted-foreground">
                              {vaccination.manufacturer || "Unknown manufacturer"}
                              {vaccination.lotNumber && ` • Lot: ${vaccination.lotNumber}`}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDate(vaccination.administrationDate)}
                          </TableCell>
                          <TableCell>
                            {formatDate(vaccination.nextDueDate)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(vaccination)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/vaccinations/${vaccination.id}`}>
                              <Button variant="ghost" size="sm">
                                Details
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious href="#" />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#" isActive>1</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext href="#" />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default VaccinationsPage;