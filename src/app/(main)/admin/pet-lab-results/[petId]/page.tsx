"use client";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  FileText,
  Loader2,
  ArrowLeft,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Pet } from "@/db/schema";
import {
  isVeterinarian,
  isTechnician,
  isPracticeAdministrator,
} from "@/lib/rbac-helpers";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getPetAvatarColors } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LabResult {
  id: number;
  labOrderId: number;
  testCatalogId: number | null;
  resultDate: string;
  results: string;
  interpretation: string;
  status: "normal" | "abnormal" | "critical" | "pending" | "inconclusive";
  referenceRange: string | null;
  notes: string | null;
  order: {
    id: number;
    provider: string;
    status: string;
    sampleType: string | null;
    priority: string;
  };
  test: {
    id: number;
    testName: string;
    testCode: string;
    category: string;
  } | null;
}

export default function PetLabResultsPage() {
  const { petId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, userPracticeId } = useUser();
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "normal" | "abnormal" | "pending"
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

  // Ensure petId is a string (handle Next.js dynamic params)
  const petIdString = Array.isArray(petId) ? petId[0] : petId;

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

  // Fetch lab results
  const {
    data: labResults,
    isLoading: isLabResultsLoading,
    error: labResultsError,
  } = useQuery({
    queryKey: [
      "labResults",
      "pet",
      petIdString,
      selectedFilter,
      debouncedSearch,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("petId", petIdString);

      const response = await apiRequest(
        "GET",
        `/api/lab-results?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch lab results");
      return response.json();
    },
    enabled: !!petIdString,
  });

  // Flatten lab results data
  const results: LabResult[] = labResults || [];

  // Filter lab results based on search and status
  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      // Filter by status
      if (selectedFilter !== "all" && result.status !== selectedFilter) {
        return false;
      }

      // Filter by search
      if (!debouncedSearch) return true;
      const searchTerm = debouncedSearch.toLowerCase();
      return (
        (result.test?.testName &&
          result.test.testName.toLowerCase().includes(searchTerm)) ||
        (result.test?.testCode &&
          result.test.testCode.toLowerCase().includes(searchTerm)) ||
        (result.interpretation &&
          result.interpretation.toLowerCase().includes(searchTerm)) ||
        (result.notes && result.notes.toLowerCase().includes(searchTerm)) ||
        (result.results && result.results.toLowerCase().includes(searchTerm))
      );
    });
  }, [results, selectedFilter, debouncedSearch]);

  // Practitioners map for name lookup
  const practiceIdForUsers: string | undefined = (user as any)?.practiceId
    ? String((user as any).practiceId)
    : userPracticeId
    ? String(userPracticeId)
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
    if (labResultsError) {
      toast({
        title: "Error loading lab results",
        description: "Could not load the pet's lab results. Please try again.",
        variant: "destructive",
      });
    }
  }, [labResultsError, toast]);

  if (!isPractitioner) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              You don't have permission to access lab results.
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "normal":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "abnormal":
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "bg-green-100 text-green-800 border-green-200";
      case "abnormal":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getProviderBadge = (provider: string) => {
    const colorMap: Record<string, string> = {
      idexx: "bg-purple-100 text-purple-800 border-purple-200",
      antech: "bg-blue-100 text-blue-800 border-blue-200",
      zoetis: "bg-green-100 text-green-800 border-green-200",
      heska: "bg-orange-100 text-orange-800 border-orange-200",
      in_house: "bg-indigo-100 text-indigo-800 border-indigo-200",
      other: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colorMap[provider] || colorMap.other;
  };

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
              <h1 className="text-2xl font-bold">{pet.name}'s Lab Results</h1>
              <p className="text-muted-foreground">
                {pet.species} {pet.breed ? `• ${pet.breed}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href={`/admin/lab-integration?tab=orders&action=create&petId=${petIdString}`}
          >
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              New Lab Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Filter by status:</span>
          <Select
            value={selectedFilter}
            onValueChange={(value: any) => setSelectedFilter(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="abnormal">Abnormal</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 w-full md:w-80">
          <Input
            placeholder="Search lab results..."
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

      {/* Lab Results List */}
      {isLabResultsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 w-full bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : filteredResults.length > 0 ? (
        <div className="space-y-4">
          {filteredResults
            .sort(
              (a: LabResult, b: LabResult) =>
                new Date(b.resultDate).getTime() -
                new Date(a.resultDate).getTime()
            )
            .map((result: LabResult) => (
              <Card key={result.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center space-x-2">
                        {getStatusIcon(result.status)}
                        <span>
                          {result.test?.testName || `Lab Test ${result.id}`}
                        </span>
                        <Badge className={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                        {result.order?.provider && (
                          <Badge
                            className={getProviderBadge(result.order.provider)}
                          >
                            {result.order.provider.toUpperCase()}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-4 text-sm">
                          <span>
                            Result Date:{" "}
                            {format(new Date(result.resultDate), "PPP")}
                          </span>
                          {result.test?.category && (
                            <span>
                              Category: {result.test.category.replace("_", " ")}
                            </span>
                          )}
                          {result.order?.sampleType && (
                            <span>Sample: {result.order.sampleType}</span>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/lab-results/${result.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Results
                      </h4>
                      <div className="mt-1 text-sm bg-muted p-3 rounded-md font-mono text-xs whitespace-pre-wrap">
                        {result.results || "No detailed results available"}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Interpretation
                      </h4>
                      <p className="mt-1 text-sm">
                        {result.interpretation || "No interpretation provided"}
                      </p>
                    </div>
                  </div>

                  {result.referenceRange && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Reference Range
                      </h4>
                      <div className="mt-1 text-sm bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                        {result.referenceRange}
                      </div>
                    </div>
                  )}

                  {result.notes && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Additional Notes
                      </h4>
                      <p className="mt-1 text-sm">{result.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Lab Results Found</h3>
            <p className="text-muted-foreground mt-2">
              {selectedFilter === "all"
                ? `${pet.name} doesn't have any lab results yet.`
                : `No ${selectedFilter} lab results found.`}
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Link
                href={`/admin/lab-integration?tab=orders&action=create&petId=${petIdString}`}
              >
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Lab Order
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => setSelectedFilter("all")}
              >
                View All Results
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
