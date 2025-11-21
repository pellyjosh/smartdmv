import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Pill, 
  Clock, 
  Calendar, 
  User, 
  AlarmClock, 
  ScrollText, 
  Package2, 
  RotateCcw, 
  RefreshCw,
  AlertCircle
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface SoapPrescriptionDisplayProps {
  soapNoteId: number;
}

export function SoapPrescriptionDisplay({ soapNoteId }: SoapPrescriptionDisplayProps) {
  // Fetch prescriptions for this SOAP note
  const { data: prescriptions, isLoading, error } = useQuery({
    queryKey: ['/api/prescriptions', { soapNoteId }],
    queryFn: async () => {
      const response = await fetch(`/api/prescriptions?soapNoteId=${soapNoteId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch prescriptions");
      }
      return response.json();
    },
    enabled: !!soapNoteId && soapNoteId > 0
  });

  // Fetch inventory items for medication details
  const { data: inventoryItems } = useQuery({
    queryKey: ['/api/inventory', { type: 'medication' }],
    queryFn: async () => {
      const response = await fetch(`/api/inventory?type=medication`);
      if (!response.ok) {
        throw new Error("Failed to fetch medications");
      }
      return response.json();
    }
  });

  // Helper function to get inventory item details
  const getInventoryItem = (inventoryItemId: string | number) => {
    return inventoryItems?.find((item: any) => 
      item.id.toString() === inventoryItemId?.toString()
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load prescriptions: {(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  if (!prescriptions || prescriptions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Pill className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
        <p className="text-lg font-medium">No prescriptions added yet</p>
        <p className="text-sm">Prescriptions will appear here once added to this SOAP note.</p>
      </div>
    );
  }

  return (
    <div className="max-h-[400px] overflow-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
      <div className="space-y-4 min-w-[600px]">
        <div className="overflow-x-auto scrollbar-thin">
          <div className="space-y-4">
            {prescriptions.map((prescription: any) => {
              const medicationItem = getInventoryItem(prescription.inventoryItemId);

              return (
                <Card key={prescription.id} className="border border-slate-200 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Pill className="h-6 w-6 text-blue-600" />
                        <div>
                          <CardTitle className="text-lg">
                            {medicationItem?.name || `Medication #${prescription.inventoryItemId}`}
                          </CardTitle>
                          <CardDescription className="text-base mt-1">
                            {prescription.dosage}, {prescription.route}, {prescription.frequency}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={prescription.status === "active" ? "default" : "secondary"}>
                          {prescription.status}
                        </Badge>
                        {prescription.createdAt && (
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(prescription.createdAt), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dosage Info</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <ScrollText className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground min-w-[50px]">Dosage:</span>
                            <span className="font-medium text-sm">{prescription.dosage}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <AlarmClock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground min-w-[50px]">Freq:</span>
                            <span className="font-medium text-sm">{prescription.frequency}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground min-w-[50px]">Dur:</span>
                            <span className="font-medium text-sm">{prescription.duration}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground min-w-[50px]">Route:</span>
                            <span className="font-medium text-sm">{prescription.route}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">QTY & Refills</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <RotateCcw className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground min-w-[30px]">QTY:</span>
                            <span className="font-medium text-sm">
                              {prescription.quantityPrescribed}
                              {prescription.quantityDispensed && (
                                <span className="text-xs ml-1 text-muted-foreground">
                                  ({prescription.quantityDispensed} disp)
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground min-w-[30px]">Ref:</span>
                            <span className="font-medium text-sm">{prescription.refills || 0}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground min-w-[30px]">Stock:</span>
                            <span className="font-medium text-sm">
                              {medicationItem?.quantity !== undefined ? (
                                <span className={medicationItem.quantity > 0 ? "text-green-600" : "text-red-600"}>
                                  {medicationItem.quantity} {medicationItem.unit || 'units'}
                                </span>
                              ) : (
                                "Unknown"
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Prescriber</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground min-w-[50px]">Presc:</span>
                            <span className="font-medium text-sm">Dr. {prescription.prescribedBy}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {prescription.instructions && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Instructions</h4>
                        <div className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-md border max-h-[100px] overflow-y-auto scrollbar-thin">
                          {prescription.instructions}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
