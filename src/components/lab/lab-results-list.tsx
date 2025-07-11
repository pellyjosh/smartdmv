import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  FileText,
  Plus,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Type definitions
interface LabResultParameter {
  name: string;
  value: string;
  units: string;
  status: "normal" | "abnormal" | "critical";
  referenceRange?: string;
  previousValue?: string;
  trend?: "up" | "down" | "stable";
}

interface LabResult {
  id: number;
  testName: string;
  status: "normal" | "abnormal" | "critical" | "pending" | "inconclusive";
  resultDate: string;
  parameters: LabResultParameter[];
  notes?: string;
  soapLinks?: {
    id: number;
    soapNoteId: number;
    displaySection: "subjective" | "objective" | "assessment" | "plan";
    highlighted: boolean;
    notes?: string;
  }[];
}

// Props for the component
interface LabResultsListProps {
  petId: number;
  soapNoteId?: number;
  onSelectResults?: (results: LabResult[]) => void;
  displayMode?: "full" | "compact" | "linked";
  section?: "subjective" | "objective" | "assessment" | "plan";
}

export function LabResultsList({ 
  petId, 
  soapNoteId, 
  onSelectResults,
  displayMode = "full",
  section
}: LabResultsListProps) {
  const { toast } = useToast();
  const [selectedResults, setSelectedResults] = useState<LabResult[]>([]);
  const [showDetails, setShowDetails] = useState<number | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string>(section || "all");
  
  // Fetch lab results for the pet
  const {
    data: labResults,
    isLoading,
    error
  } = useQuery({
    queryKey: ["/api/lab/results/pet", petId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/lab/results/pet/${petId}`);
      return await response.json() as LabResult[];
    },
    enabled: !!petId
  });

  // Link lab result to SOAP note
  const linkResultMutation = useMutation({
    mutationFn: async ({ 
      resultId, 
      soapNoteId, 
      displaySection, 
      highlighted = false,
      notes = ""
    }: { 
      resultId: number, 
      soapNoteId: number, 
      displaySection: string,
      highlighted?: boolean,
      notes?: string
    }) => {
      const response = await apiRequest(
        "POST", 
        `/api/lab/results/${resultId}/link-to-soap`, 
        { soapNoteId, displaySection, highlighted, notes }
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lab result linked",
        description: "The lab result has been linked to the SOAP note.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lab/results/pet", petId] });
      if (soapNoteId) {
        queryClient.invalidateQueries({ queryKey: ["/api/soap-notes", soapNoteId] });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to link lab result: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Unlink lab result from SOAP note
  const unlinkResultMutation = useMutation({
    mutationFn: async ({ linkId }: { linkId: number }) => {
      const response = await apiRequest("DELETE", `/api/lab/soap-links/${linkId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lab result unlinked",
        description: "The lab result has been removed from the SOAP note.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lab/results/pet", petId] });
      if (soapNoteId) {
        queryClient.invalidateQueries({ queryKey: ["/api/soap-notes", soapNoteId] });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to unlink lab result: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle selection of results
  const handleSelectResult = (result: LabResult) => {
    if (onSelectResults) {
      if (selectedResults.some(r => r.id === result.id)) {
        setSelectedResults(selectedResults.filter(r => r.id !== result.id));
      } else {
        setSelectedResults([...selectedResults, result]);
      }
    }
  };

  // Handle linking results to SOAP note
  const handleLinkResults = () => {
    if (soapNoteId && section) {
      selectedResults.forEach(result => {
        linkResultMutation.mutate({
          resultId: result.id,
          soapNoteId,
          displaySection: section
        });
      });
      // Clear selections after linking
      setSelectedResults([]);
    } else if (soapNoteId && onSelectResults) {
      // If section is not provided but the user wants to select results
      // We can call onSelectResults directly
      onSelectResults(selectedResults);
      setSelectedResults([]);
    }
  };

  // Handle unlinking a result from SOAP note
  const handleUnlinkResult = (linkId: number) => {
    unlinkResultMutation.mutate({ linkId });
  };

  // Display status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "normal":
        return <Badge variant="outline" className="bg-green-100"><CheckCircle2 className="mr-1 h-3 w-3" /> Normal</Badge>;
      case "abnormal":
        return <Badge variant="outline" className="bg-amber-100"><AlertCircle className="mr-1 h-3 w-3" /> Abnormal</Badge>;
      case "critical":
        return <Badge variant="outline" className="bg-red-100"><AlertTriangle className="mr-1 h-3 w-3" /> Critical</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-blue-100">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Display trend indicator
  const renderTrend = (trend?: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-blue-500" />;
      case "stable":
        return <Minus className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  // Filter results based on display mode
  const filteredResults = labResults?.filter(result => {
    if (displayMode === "linked" && soapNoteId) {
      // Only show results linked to this SOAP note
      return result.soapLinks?.some(link => link.soapNoteId === soapNoteId);
    }
    
    // For section filtering
    if ((section || sectionFilter !== "all") && result.soapLinks) {
      const filterSection = section || sectionFilter;
      return result.soapLinks.some(link => 
        link.soapNoteId === soapNoteId && link.displaySection === filterSection
      );
    }
    
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-md bg-red-50">
        <p className="text-red-600">Error loading lab results: {(error as Error).message}</p>
      </div>
    );
  }

  if (!labResults || labResults.length === 0) {
    return (
      <div className="p-4 border rounded-md bg-gray-50">
        <p className="text-gray-500">No lab results available for this patient.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section filter for linked display mode */}
      {displayMode === "linked" && soapNoteId && (
        <div className="flex justify-end">
          <Select 
            value={sectionFilter} 
            onValueChange={setSectionFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              <SelectItem value="subjective">Subjective</SelectItem>
              <SelectItem value="objective">Objective</SelectItem>
              <SelectItem value="assessment">Assessment</SelectItem>
              <SelectItem value="plan">Plan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Results table */}
      <Table>
        <TableCaption>Lab results for patient</TableCaption>
        <TableHeader>
          <TableRow>
            {onSelectResults && <TableHead className="w-[50px]"></TableHead>}
            <TableHead>Test Name</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredResults?.map((result) => (
            <TableRow key={result.id}>
              {onSelectResults && (
                <TableCell>
                  <input 
                    type="checkbox" 
                    checked={selectedResults.some(r => r.id === result.id)}
                    onChange={() => handleSelectResult(result)}
                    className="h-4 w-4"
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">{result.testName}</TableCell>
              <TableCell>{format(new Date(result.resultDate), "MMM d, yyyy")}</TableCell>
              <TableCell>{renderStatusBadge(result.status)}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setShowDetails(result.id)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View details</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* Unlink button for linked view */}
                  {displayMode === "linked" && soapNoteId && result.soapLinks?.map(link => 
                    link.soapNoteId === soapNoteId && (
                      <TooltipProvider key={link.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleUnlinkResult(link.id)}
                            >
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                className="h-4 w-4 text-red-500"
                              >
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                <line x1="4" y1="20" x2="20" y2="4"></line>
                              </svg>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove from SOAP note</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Action buttons */}
      {onSelectResults && selectedResults.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleLinkResults}>
            Add Selected Results to SOAP Note
          </Button>
        </div>
      )}

      {/* Result details dialog */}
      {showDetails && (
        <Dialog open={!!showDetails} onOpenChange={() => setShowDetails(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Lab Result Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {labResults
                .filter(result => result.id === showDetails)
                .map(result => (
                  <div key={result.id} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Test Name</p>
                        <p>{result.testName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Date</p>
                        <p>{format(new Date(result.resultDate), "MMM d, yyyy")}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <div>{renderStatusBadge(result.status)}</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Parameters</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parameter</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Units</TableHead>
                            <TableHead>Reference Range</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Trend</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.parameters.map((param, index) => (
                            <TableRow key={index}>
                              <TableCell>{param.name}</TableCell>
                              <TableCell className={param.status !== 'normal' ? 'font-bold' : ''}>
                                {param.value}
                                {param.previousValue && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    (Prev: {param.previousValue})
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>{param.units}</TableCell>
                              <TableCell>{param.referenceRange || 'N/A'}</TableCell>
                              <TableCell>{renderStatusBadge(param.status)}</TableCell>
                              <TableCell>{renderTrend(param.trend)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {result.notes && (
                      <div>
                        <h4 className="text-sm font-medium">Notes</h4>
                        <p className="text-sm">{result.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setShowDetails(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}