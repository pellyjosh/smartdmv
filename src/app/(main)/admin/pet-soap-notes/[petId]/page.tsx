"use client";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Clipboard,
  Loader2,
  ArrowLeft,
  Calendar,
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
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { Pet, SOAPNote } from "@/db/schema";
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

export default function PetSOAPNotesPage() {
  const { petId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "recent" | "by-practitioner"
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
    queryKey: ["pet", petId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/pets/${petId}`);
      return await response.json();
    },
    enabled: !!petId,
    retry: 1,
  });

  // Infinite (paginated) SOAP notes query
  const PAGE_SIZE = 10;
  interface SoapPage {
    items: SOAPNote[];
    nextOffset: number | null;
  }
  const {
    data: soapNotesPages,
    isLoading: isNotesLoading,
    error: notesError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<SoapPage>({
    queryKey: [
      "soapNotes",
      "pet",
      String(petId),
      selectedFilter,
      debouncedSearch,
    ],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offsetVal = typeof pageParam === "number" ? pageParam : 0;
      const params = new URLSearchParams();
      params.set("petId", String(petId));
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offsetVal));
      if (selectedFilter === "recent") params.set("recent", "true");
      if (selectedFilter === "by-practitioner" && user?.id)
        params.set("practitionerId", String(user.id));
      if (debouncedSearch) params.set("search", debouncedSearch);
      const response = await apiRequest(
        "GET",
        `/api/soap-notes?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch SOAP notes");
      const data: SOAPNote[] = await response.json();
      return {
        items: data,
        nextOffset: data.length === PAGE_SIZE ? offsetVal + PAGE_SIZE : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: !!petId,
    staleTime: 1000 * 30,
  });

  const allSoapNotes: SOAPNote[] = useMemo(() => {
    // soapNotesPages is InfiniteData<SoapPage> | undefined
    // @ts-ignore - runtime guard
    return soapNotesPages?.pages?.flatMap((p: SoapPage) => p.items) || [];
  }, [soapNotesPages]);

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
    (practitionerId: number) => {
      const match = (practitioners as any[]).find(
        (u) => Number(u.id) === practitionerId
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

  // IntersectionObserver for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            fetchNextPage();
          }
        });
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Delete SOAP note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      return apiRequest("DELETE", `/api/soap-notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["soapNotes", "pet", petId] });
      toast({
        title: "SOAP Note Deleted",
        description: "The SOAP note has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete SOAP note.",
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

  // Handle notes errors
  useEffect(() => {
    if (notesError) {
      toast({
        title: "Error loading SOAP notes",
        description: "Could not load the pet's medical records. Please try again.",
        variant: "destructive",
      });
    }
  }, [notesError, toast]);

  if (!isPractitioner) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              You don't have permission to access SOAP notes.
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

  // Items already filtered server-side; still guard for recency & practitioner if server missed
  const filteredNotes = allSoapNotes.filter((note) => {
    if (selectedFilter === "recent") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (new Date(note.createdAt) < thirtyDaysAgo) return false;
    }
    if (selectedFilter === "by-practitioner" && user?.id) {
      if (note.practitionerId !== Number(user.id)) return false;
    }
    return true;
  });

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
                {pet.name}'s Medical Records
              </h1>
              <p className="text-muted-foreground">
                {pet.species} {pet.breed ? `• ${pet.breed}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link href={`/admin/soap-notes/create?petId=${petId}`}>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              New SOAP Note
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
            variant={selectedFilter === "recent" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter("recent")}
          >
            Recent
          </Button>
          <Button
            variant={
              selectedFilter === "by-practitioner" ? "default" : "outline"
            }
            size="sm"
            onClick={() => setSelectedFilter("by-practitioner")}
          >
            My Notes
          </Button>
        </div>
        <div className="flex items-center gap-2 w-full md:w-80">
          <Input
            placeholder="Search notes (S/O/A/P)"
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

      {/* SOAP Notes List */}
      {isNotesLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 w-full bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="space-y-4">
          {filteredNotes
            .sort(
              (a: SOAPNote, b: SOAPNote) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
            .map((note: SOAPNote) => (
              <Card key={note.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center space-x-2">
                        <Clipboard className="h-4 w-4" />
                        <span>SOAP Note</span>
                        <Badge variant="secondary">
                          {format(new Date(note.createdAt), "PPP")}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Created by: {practitionerName(note.practitionerId)} at{" "}
                        {format(new Date(note.createdAt), "p")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/soap-notes/${note.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNoteMutation.mutate(note.id)}
                        disabled={deleteNoteMutation.isPending}
                      >
                        {deleteNoteMutation.isPending ? (
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
                        Subjective
                      </h4>
                      <p className="mt-1 text-sm">{note.subjective}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Objective
                      </h4>
                      <p className="mt-1 text-sm">{note.objective}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Assessment
                      </h4>
                      <p className="mt-1 text-sm">{note.assessment}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Plan
                      </h4>
                      <p className="mt-1 text-sm">{note.plan}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          {/* Load more sentinel */}
          <div ref={loadMoreRef} />
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!hasNextPage && filteredNotes.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">
              End of results
            </p>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Clipboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No SOAP Notes Found</h3>
            <p className="text-muted-foreground mt-2">
              {selectedFilter === "all"
                ? `${pet.name} doesn't have any SOAP notes yet.`
                : "No SOAP notes match the current filter."}
            </p>
            <Link href={`/admin/soap-notes/create?petId=${petId}`}>
              <Button className="mt-4">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create First SOAP Note
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
