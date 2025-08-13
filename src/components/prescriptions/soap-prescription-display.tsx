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
                <div className="flex items-center gap-2">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dosage Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <ScrollText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground min-w-[80px]">Dosage:</span>
                      <span className="font-medium">{prescription.dosage}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <AlarmClock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground min-w-[80px]">Frequency:</span>
                      <span className="font-medium">{prescription.frequency}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground min-w-[80px]">Duration:</span>
                      <span className="font-medium">{prescription.duration}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground min-w-[80px]">Route:</span>
                      <span className="font-medium">{prescription.route}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Quantity & Refills</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <RotateCcw className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground min-w-[80px]">Quantity:</span>
                      <span className="font-medium">
                        {prescription.quantityPrescribed}
                        {prescription.quantityDispensed && (
                          <span className="text-xs ml-2 text-muted-foreground">
                            ({prescription.quantityDispensed} dispensed)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground min-w-[80px]">Refills:</span>
                      <span className="font-medium">{prescription.refills || 0}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Package2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground min-w-[80px]">Stock:</span>
                      <span className="font-medium">
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

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Prescriber Info</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground min-w-[80px]">Prescribed by:</span>
                      <span className="font-medium">Dr. {prescription.prescribedBy}</span>
                    </div>
                  </div>
                </div>
              </div>

              {prescription.instructions && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Instructions</h4>
                  <div className="text-sm bg-slate-50 dark:bg-slate-800 p-4 rounded-md border">
                    {prescription.instructions}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
