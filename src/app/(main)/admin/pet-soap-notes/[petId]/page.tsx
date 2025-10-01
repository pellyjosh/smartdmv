"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PlusCircle, Clipboard, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Pet } from "@/db/schemas/petsSchema";

// Simplified Pet SOAP Notes Page matching provided design (no note listing yet)
export default function PetSOAPNotesPage() {
  const { petId } = useParams<{ petId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  // Fetch pet data (simple pattern – existing API assumed to return JSON pet)
  const { data: pet, isLoading: isPetLoading, error: petError } = useQuery<Pet>({
    queryKey: petId ? [`/api/pets/${petId}`] : ["/api/pets/invalid"],
    queryFn: async () => {
      if (!petId) throw new Error("Invalid pet id");
      const res = await fetch(`/api/pets/${petId}`);
      if (!res.ok) throw new Error("Failed to fetch pet");
      return res.json();
    },
    enabled: !!petId,
    retry: 1,
  });

  // Error side effect
  useEffect(() => {
    if (petError) {
      toast({
        title: "Error loading pet information",
        description: "Could not load the pet details. Please try again.",
        variant: "destructive",
      });
    }
  }, [petError, toast]);

  // Loading state
  if (isPetLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 404 / Not Found state
  if (!pet && !isPetLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pet Not Found</h1>
          </div>
          <Button variant="outline" onClick={() => router.push("/admin/clients")}>Back to Clients</Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Clipboard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Pet Not Found</h3>
              <p className="text-muted-foreground mb-6">The pet you're looking for doesn't exist or has been removed</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => router.push("/admin/clients")}>View All Clients</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateSoapNote = () => {
    router.push(`/admin/soap-notes/create?petId=${pet?.id}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medical Records: {pet?.name}</h1>
          <p className="text-muted-foreground mt-1">
            {pet?.species} {pet?.breed ? `• ${pet.breed}` : ''} {pet?.weight ? `• ${pet.weight} pounds` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Back</Button>
          <Button onClick={handleCreateSoapNote}>
            <PlusCircle className="mr-2 h-4 w-4" /> New SOAP Note
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Clipboard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Medical Records for {pet?.name}</h3>
            <p className="text-muted-foreground mb-6">{pet?.name} doesn't have any SOAP notes or medical records yet</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleCreateSoapNote}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create SOAP Note
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

