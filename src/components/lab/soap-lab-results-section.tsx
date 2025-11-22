import { LabResultsList } from "./lab-results-list";
import { LabResultsSelector } from "./lab-results-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useEffect } from "react";

interface SoapLabResultsSectionProps {
  petId: number;
  soapNoteId: number;
  section: "subjective" | "objective" | "assessment" | "plan";
  isEditable?: boolean;
}

export function SoapLabResultsSection({
  petId,
  soapNoteId,
  section,
  isEditable = true
}: SoapLabResultsSectionProps) {
  const queryClient = useQueryClient();

  // Clear any stale cached queries on mount to ensure fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/soap-notes/lab-results"] });
    queryClient.invalidateQueries({ queryKey: ["/api/lab/results/pet", petId] });
  }, [queryClient, petId]);

  // Fetch lab results for this pet and filter for linked results from this SOAP note
  const {
    data: labResults,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["/api/lab/results/pet", petId],
    queryFn: async () => {
      // Only fetch if we have a pet ID
      if (!petId) return [];

      try {
        const response = await apiRequest(
          "GET",
          `/api/lab/results/pet/${petId}`
        );
        return await response.json();
      } catch (error) {
        console.warn("Failed to fetch lab results:", error);
        return [];
      }
    },
    enabled: !!petId && petId > 0
  });

  // Filter for results linked to this specific SOAP note and section
  const linkedResults = labResults?.filter((result: any) =>
    result.soapLinks?.some((link: any) =>
      link.soapNoteId === soapNoteId && link.displaySection === section
    )
  );

  const handleResultsAdded = () => {
    refetch();
  };

  const hasResults = !isLoading && linkedResults && linkedResults.length > 0;

  return (
    <div className="space-y-4 mt-2">
      {hasResults && (
        <>
          <Separator className="my-2" />
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-md">Lab Results</CardTitle>
              <CardDescription>
                Test results linked to this section
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LabResultsList
                petId={petId.toString()}
                soapNoteId={soapNoteId}
                displayMode="linked"
                section={section}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Add lab results button */}
      {isEditable && (
        <LabResultsSelector
          petId={petId.toString()}
          soapNoteId={soapNoteId}
          section={section}
          onResultsAdded={handleResultsAdded}
        />
      )}
    </div>
  );
}
