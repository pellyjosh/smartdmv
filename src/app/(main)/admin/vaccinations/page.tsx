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
import { Loader2, Plus, Search, Filter, Calendar, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { isPracticeAdministrator, isVeterinarian, isAdmin } from '@/lib/rbac-helpers';
import { format } from "date-fns";


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

  // Get vaccination priority for sorting (higher number = more urgent)
  const getVaccinationPriority = (vaccination: any): number => {
    const { status, nextDueDate, expirationDate } = vaccination;
    
    if (status === "cancelled") return 0;
    if (status === "missed") return 5;
    
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    // Check expiration dates first
    if (expirationDate) {
      const expDate = new Date(expirationDate);
      if (expDate < today) return 4; // Expired
      if (expDate < thirtyDaysFromNow) return 3; // Expiring soon
    }
    
    // Check due dates
    if (nextDueDate) {
      const dueDate = new Date(nextDueDate);
      if (dueDate < today) return 4; // Overdue
      if (dueDate < thirtyDaysFromNow) return 2; // Due soon
    }
    
    return 1; // Valid
  };

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
    })
    // Sort by priority (most urgent first) then by administration date
    ?.sort((a: any, b: any) => {
      const priorityA = getVaccinationPriority(a);
      const priorityB = getVaccinationPriority(b);
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }
      
      // If same priority, sort by administration date (newest first)
      const dateA = new Date(a.administrationDate).getTime();
      const dateB = new Date(b.administrationDate).getTime();
      return dateB - dateA;
    });

  // Find pet name by ID
  const getPetName = (petId: any): string => {
    const pet = pets?.find((p: any) => p.id === petId);
    return pet ? pet.name : "Unknown Pet";
  };

  // Get pet species by ID
  const getPetSpecies = (petId: any): string => {
    const pet = pets?.find((p: any) => p.id === petId);
    return pet ? pet.species : "Unknown";
  };

  // Calculate statistics
  const getVaccinationStats = () => {
    if (!vaccinations) return { total: 0, overdue: 0, dueThisMonth: 0, valid: 0 };
    
    const today = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(today.getMonth() + 1);
    
    let overdue = 0;
    let dueThisMonth = 0;
    let valid = 0;
    
    vaccinations.forEach((vaccination: any) => {
      const priority = getVaccinationPriority(vaccination);
      if (priority >= 4) overdue++;
      else if (priority >= 2) dueThisMonth++;
      else valid++;
    });
    
    return {
      total: vaccinations.length,
      overdue,
      dueThisMonth,
      valid
    };
  };

  const stats = getVaccinationStats();

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

  const canManageVaccinations =
    isPracticeAdministrator(user as any) ||
    isVeterinarian(user as any) ||
    isAdmin(user as any);

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
              <Link href="/admin/vaccinations/types">
                <Button variant="outline">
                  Manage Vaccine Types
                </Button>
              </Link>
              <Link href="/admin/vaccinations/add">
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> 
                  Add Vaccination
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        {!isLoadingVaccinations && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="rounded-full p-2 bg-blue-100">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="rounded-full p-2 bg-red-100">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="rounded-full p-2 bg-yellow-100">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Due Soon</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.dueThisMonth}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="rounded-full p-2 bg-green-100">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Up to Date</p>
                    <p className="text-2xl font-bold text-green-600">{stats.valid}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
                  <Link href="/admin/vaccinations/add">
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
                        <TableHead>Administering Vet</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVaccinations.map((vaccination: any) => (
                        <TableRow key={vaccination.id}>
                          <TableCell>
                            <Link href={`/pets/${vaccination.petId}`}>
                              <div className="flex flex-col">
                                <span className="font-medium hover:underline cursor-pointer">
                                  {getPetName(vaccination.petId)}
                                </span>
                                <span className="text-xs text-muted-foreground capitalize">
                                  {getPetSpecies(vaccination.petId)}
                                </span>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="font-medium">{vaccination.vaccineName}</div>
                              <div className="text-xs text-muted-foreground">
                                {vaccination.manufacturer || "Unknown manufacturer"}
                                {vaccination.lotNumber && ` • Lot: ${vaccination.lotNumber}`}
                              </div>
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
                          <TableCell>
                            <div className="text-sm">
                              {vaccination.administeringVet?.name || "Not specified"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/admin/vaccinations/${vaccination.id}`}>
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