import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";

import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface PrescriptionListProps {
  soapNoteId: number;
  readOnly?: boolean;
}

export function PrescriptionList({ soapNoteId, readOnly = false }: PrescriptionListProps) {
  const { toast } = useToast();
  const [dispenseDialogOpen, setDispenseDialogOpen] = useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<number | null>(null);
  const [dispenseQuantity, setDispenseQuantity] = useState("1");

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

  // Dispensing mutation
  const dispenseMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number, quantity: string }) => {
      const response = await fetch(`/api/prescriptions/${id}/dispense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to dispense medication");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Medication dispensed",
        description: "The medication has been dispensed successfully",
      });
      
      // Reset and close dialog
      setDispenseDialogOpen(false);
      setSelectedPrescriptionId(null);
      setDispenseQuantity("1");
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error dispensing medication",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDispenseDialog = (prescriptionId: number) => {
    setSelectedPrescriptionId(prescriptionId);
    setDispenseDialogOpen(true);
  };

  const handleDispense = () => {
    if (selectedPrescriptionId && dispenseQuantity) {
      dispenseMutation.mutate({ 
        id: selectedPrescriptionId, 
        quantity: dispenseQuantity 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
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
      <div className="text-center py-4 text-muted-foreground">
        <Pill className="h-10 w-10 mx-auto mb-2 text-muted-foreground/60" />
        <p>No prescriptions have been added yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-card p-4 rounded-lg shadow-sm">
      <Accordion type="single" collapsible className="w-full">
        {prescriptions.map((prescription: any) => {
          const medicationItem = getInventoryItem(prescription.inventoryItemId);
          
          return (
            <AccordionItem key={prescription.id} value={`prescription-${prescription.id}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2 text-left">
                  <Pill className="h-4 w-4" />
                  <span>
                    {medicationItem?.name || `Medication #${prescription.inventoryItemId}`}
                    {" - "}
                    {prescription.dosage}, {prescription.route}, {prescription.frequency}
                  </span>
                  <Badge variant={prescription.status === "active" ? "default" : "secondary"} className="ml-2">
                    {prescription.status}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card className="border-0 shadow-none">
                  <CardContent className="p-0 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm grid grid-cols-[120px_1fr] gap-1">
                          <span className="text-muted-foreground flex items-center">
                            <Package2 className="h-3.5 w-3.5 mr-1" /> Medication:
                          </span>
                          <span className="font-medium">
                            {medicationItem?.name || `Medication #${prescription.inventoryItemId}`}
                            {medicationItem?.quantity !== undefined && (
                              <span className="text-xs ml-2 text-muted-foreground">
                                ({medicationItem.quantity} {medicationItem.unit || 'units'} in stock)
                              </span>
                            )}
                          </span>

                          <span className="text-muted-foreground flex items-center">
                            <AlarmClock className="h-3.5 w-3.5 mr-1" /> Frequency:
                          </span>
                          <span className="font-medium">{prescription.frequency}</span>

                          <span className="text-muted-foreground flex items-center">
                            <ScrollText className="h-3.5 w-3.5 mr-1" /> Dosage:
                          </span>
                          <span className="font-medium">{prescription.dosage}</span>

                          <span className="text-muted-foreground flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1" /> Duration:
                          </span>
                          <span className="font-medium">{prescription.duration}</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm grid grid-cols-[120px_1fr] gap-1">
                          <span className="text-muted-foreground flex items-center">
                            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refills:
                          </span>
                          <span className="font-medium">{prescription.refills || 0}</span>

                          <span className="text-muted-foreground flex items-center">
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Quantity:
                          </span>
                          <span className="font-medium">
                            {prescription.quantityPrescribed} 
                            {prescription.quantityDispensed && (
                              <span className="text-xs ml-2 text-muted-foreground">
                                ({prescription.quantityDispensed} dispensed)
                              </span>
                            )}
                          </span>

                          <span className="text-muted-foreground flex items-center">
                            <User className="h-3.5 w-3.5 mr-1" /> Prescribed by:
                          </span>
                          <span className="font-medium">Dr. {prescription.prescribedBy}</span>

                          <span className="text-muted-foreground flex items-center">
                            <Calendar className="h-3.5 w-3.5 mr-1" /> Date:
                          </span>
                          <span className="font-medium">
                            {prescription.createdAt ? format(new Date(prescription.createdAt), 'MMM d, yyyy') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {prescription.instructions && (
                      <>
                        <Separator className="my-3" />
                        <div className="mt-2">
                          <div className="text-muted-foreground text-sm mb-1">Instructions:</div>
                          <div className="text-sm bg-slate-50 p-2 rounded whitespace-pre-wrap">
                            {prescription.instructions}
                          </div>
                        </div>
                      </>
                    )}

                    {!readOnly && (
                      <div className="mt-4 flex justify-end">
                        <Button 
                          size="sm" 
                          onClick={() => handleOpenDispenseDialog(prescription.id)}
                          disabled={prescription.status !== "active" || !medicationItem?.quantity || medicationItem?.quantity <= 0}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Dispense
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Dispense Dialog */}
      <Dialog open={dispenseDialogOpen} onOpenChange={setDispenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispense Medication</DialogTitle>
            <DialogDescription>
              Enter the quantity to dispense. This will update the inventory accordingly.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center gap-2">
              <label htmlFor="quantity" className="text-sm font-medium whitespace-nowrap">
                Quantity to dispense:
              </label>
              <Input
                id="quantity"
                value={dispenseQuantity}
                onChange={(e) => setDispenseQuantity(e.target.value)}
                className="max-w-[100px]"
                type="number"
                min="1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispenseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDispense} disabled={dispenseMutation.isPending}>
              {dispenseMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Dispense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}