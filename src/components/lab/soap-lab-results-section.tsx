import { LabResultsList } from "./lab-results-list";
import { LabResultsSelector } from "./lab-results-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SoapLabResultsSectionProps {
  petId: string;
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
  // Fetch linked lab results for this section
  const {
    data: linkedResults,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["/api/soap-notes/lab-results", soapNoteId, section],
    queryFn: async () => {
      const response = await apiRequest(
        "GET", 
        `/api/soap-notes/${soapNoteId}/lab-results?section=${section}`
      );
      return await response.json();
    },
    enabled: !!soapNoteId
  });

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
                petId={petId}
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
          petId={petId}
          soapNoteId={soapNoteId}
          section={section}
          onResultsAdded={handleResultsAdded}
        />
      )}
    </div>
  );
}