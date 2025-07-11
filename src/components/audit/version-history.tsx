'use client';
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, History, ArrowDown, ArrowUp, RotateCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type RecordType = "soap_note" | "lab_result" | "prescription" | "vaccination" | "treatment" | "health_plan";

interface VersionHistoryProps {
  recordId: number;
  recordType: RecordType;
  isOpen: boolean;
  onClose: () => void;
}

export function VersionHistory({ recordId, recordType, isOpen, onClose }: VersionHistoryProps) {
  const { toast } = useToast();
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [compareVersions, setCompareVersions] = useState<{
    versionA: number | null;
    versionB: number | null;
  }>({
    versionA: null,
    versionB: null,
  });
  const [activeTab, setActiveTab] = useState("history");
  
  // Fetch version history
  const { 
    data: versionHistory, 
    isLoading: isLoadingHistory,
    error: historyError
  } = useQuery({
    queryKey: [`/api/audit/${recordType}s/${recordId}/versions`],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string);
      if (!response.ok) {
        throw new Error("Failed to fetch version history");
      }
      return response.json();
    },
    enabled: isOpen,
  });
  
  // Fetch comparison data when both versions are selected
  const { 
    data: comparisonData, 
    isLoading: isLoadingComparison,
    error: comparisonError
  } = useQuery({
    queryKey: [
      `/api/audit/${recordType}s/${recordId}/compare`,
      compareVersions.versionA,
      compareVersions.versionB,
    ],
    queryFn: async ({ queryKey }) => {
      const url = `${queryKey[0]}?versionA=${queryKey[1]}&versionB=${queryKey[2]}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch comparison data");
      }
      return response.json();
    },
    enabled: isOpen && compareVersions.versionA !== null && compareVersions.versionB !== null,
  });
  
  // Fetch specific version details
  const { 
    data: versionDetail,
    isLoading: isLoadingDetail,
    error: detailError
  } = useQuery({
    queryKey: [`/api/audit/${recordType}s/${recordId}/versions/${selectedVersion}`],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string);
      if (!response.ok) {
        throw new Error("Failed to fetch version details");
      }
      return response.json();
    },
    enabled: isOpen && selectedVersion !== null,
  });
  
  // Reset selections when dialog is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedVersion(null);
      setCompareVersions({ versionA: null, versionB: null });
      setActiveTab("history");
    }
  }, [isOpen]);
  
  // Handle restoring a version
  const handleRestore = async (version: number) => {
    try {
      const response = await fetch(`/api/audit/${recordType}s/${recordId}/restore/${version}`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to restore version");
      }
      
      toast({
        title: "Version restored",
        description: `Successfully restored to version ${version}`,
      });
      
      // Refresh the queries
      // (This would be more elegantly done with proper mutation + cache invalidation)
      window.location.reload();
    } catch (error) {
      console.error("Error restoring version:", error);
      toast({
        title: "Restore failed",
        description: "Could not restore to the selected version",
        variant: "destructive",
      });
    }
  };
  
  // Get formatted title based on record type
  const getTitle = () => {
    switch (recordType) {
      case "soap_note":
        return "SOAP Note";
      case "lab_result":
        return "Lab Result";
      case "prescription":
        return "Prescription";
      case "vaccination":
        return "Vaccination";
      case "treatment":
        return "Treatment";
      case "health_plan":
        return "Health Plan";
      default:
        return "Record";
    }
  };
  
  // Format field names for display
  const formatFieldName = (fieldName: string) => {
    // Convert camelCase or snake_case to Title Case with spaces
    return fieldName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };
  
  // Get color badge for change type
  const getChangeTypeBadge = (changeType: string) => {
    switch (changeType) {
      case "added":
        return <Badge className="bg-green-500">Added</Badge>;
      case "removed":
        return <Badge className="bg-red-500">Removed</Badge>;
      default:
        return <Badge className="bg-blue-500">Changed</Badge>;
    }
  };
  
  // Render the comparison view
  const renderComparison = () => {
    if (isLoadingComparison) {
      return (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Comparing versions...</span>
        </div>
      );
    }
    
    if (comparisonError) {
      return (
        <div className="text-center p-5 text-red-500">
          Failed to load comparison: {(comparisonError as Error).toString()}
        </div>
      );
    }
    
    if (!comparisonData || Object.keys(comparisonData).length === 0) {
      return (
        <div className="text-center p-5">
          No differences found between the selected versions.
        </div>
      );
    }
    
    return (
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field</TableHead>
              <TableHead>Version {compareVersions.versionA}</TableHead>
              <TableHead>Version {compareVersions.versionB}</TableHead>
              <TableHead>Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(comparisonData).map(([field, change]: [string, any]) => (
              <TableRow key={field}>
                <TableCell className="font-medium">{formatFieldName(field)}</TableCell>
                <TableCell className="max-w-[200px] overflow-hidden text-ellipsis">
                  {change.previous !== null ? 
                    (typeof change.previous === 'object' 
                      ? JSON.stringify(change.previous)
                      : String(change.previous)
                    ) 
                    : "-"
                  }
                </TableCell>
                <TableCell className="max-w-[200px] overflow-hidden text-ellipsis">
                  {change.current !== null ? 
                    (typeof change.current === 'object' 
                      ? JSON.stringify(change.current) 
                      : String(change.current)
                    ) 
                    : "-"
                  }
                </TableCell>
                <TableCell>
                  {change.status 
                    ? getChangeTypeBadge(change.status)
                    : <ArrowDown className="h-4 w-4 text-blue-500" />
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };
  
  // Render the version detail view
  const renderVersionDetail = () => {
    if (isLoadingDetail) {
      return (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading version details...</span>
        </div>
      );
    }
    
    if (detailError) {
      return (
        <div className="text-center p-5 text-red-500">
          Failed to load version details: {(detailError as Error).toString()}
        </div>
      );
    }
    
    if (!versionDetail) {
      return (
        <div className="text-center p-5">
          Select a version to view details.
        </div>
      );
    }
    
    return (
      <ScrollArea className="h-[400px]">
        <div className="p-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Version {versionDetail.version}</h3>
            <p className="text-sm text-muted-foreground">
              Created {new Date(versionDetail.createdAt).toLocaleString()}
              {versionDetail.changeReason && (
                <span className="ml-2">- {versionDetail.changeReason}</span>
              )}
            </p>
          </div>
          
          <div className="space-y-4">
            {Object.entries(versionDetail.data).map(([key, value]) => (
              <div key={key} className="border-b pb-2">
                <h4 className="font-medium">{formatFieldName(key)}</h4>
                <pre className="text-sm bg-muted p-2 rounded mt-1 overflow-x-auto">
                  {typeof value === 'object' 
                    ? JSON.stringify(value, null, 2) 
                    : String(value)
                  }
                </pre>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {getTitle()} Version History
          </DialogTitle>
          <DialogDescription>
            View and compare previous versions of this {getTitle().toLowerCase()}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="compare">Compare Versions</TabsTrigger>
            <TabsTrigger value="detail" disabled={selectedVersion === null}>
              View Version
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="flex-1 flex flex-col">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center p-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading version history...</span>
              </div>
            ) : historyError ? (
              <div className="text-center p-5 text-red-500">
                Failed to load version history: {(historyError as Error).toString()}
              </div>
            ) : !versionHistory || versionHistory.length === 0 ? (
              <div className="text-center p-5">
                No version history available for this record.
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versionHistory.map((version: any) => (
                      <TableRow key={version.id}>
                        <TableCell>{version.version}</TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>{version.createdByUser?.name || `User #${version.createdBy}`}</TableCell>
                        <TableCell>{version.changeReason || "-"}</TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedVersion(version.version);
                              setActiveTab("detail");
                            }}
                          >
                            View
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(version.version)}
                          >
                            <RotateCw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="compare" className="flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Version A (Previous)</label>
                <Select
                  value={compareVersions.versionA?.toString() || ""}
                  onValueChange={(v) => setCompareVersions(prev => ({ ...prev, versionA: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versionHistory?.map((version: any) => (
                      <SelectItem key={`a-${version.id}`} value={version.version.toString()}>
                        Version {version.version} ({new Date(version.createdAt).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Version B (Current)</label>
                <Select
                  value={compareVersions.versionB?.toString() || ""}
                  onValueChange={(v) => setCompareVersions(prev => ({ ...prev, versionB: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versionHistory?.map((version: any) => (
                      <SelectItem key={`b-${version.id}`} value={version.version.toString()}>
                        Version {version.version} ({new Date(version.createdAt).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {compareVersions.versionA !== null && compareVersions.versionB !== null ? (
              renderComparison()
            ) : (
              <div className="text-center p-10 text-muted-foreground">
                Select two versions to compare
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="detail" className="flex-1 flex flex-col">
            {renderVersionDetail()}
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}