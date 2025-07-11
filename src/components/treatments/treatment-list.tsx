import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Treatment, UserRoleEnum } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { 
  AlertCircle, Check, Clock, Edit, Pill, Stethoscope, 
  Syringe, Activity, Trash, Eye 
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, 
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

interface TreatmentListProps {
  soapNoteId: number;
  locked: boolean;
  onAddTreatment?: () => void;
  onEditTreatment?: (treatment: Treatment) => void;
}

export function TreatmentList({ 
  soapNoteId, 
  locked, 
  onAddTreatment, 
  onEditTreatment 
}: TreatmentListProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [treatmentToDelete, setTreatmentToDelete] = React.useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const canEdit = user?.role === UserRoleEnum.VETERINARIAN || 
                  user?.role === UserRoleEnum.PRACTICE_ADMINISTRATOR || 
                  user?.role === UserRoleEnum.PRACTICE_MANAGER;
  
  const { data: treatments, isLoading, error } = useQuery({ 
    queryKey: ['/api/treatments/soap-note', soapNoteId],
    queryFn: async () => {
      const response = await fetch(`/api/treatments/soap-note/${soapNoteId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch treatments');
      }
      return response.json();
    },
    enabled: !!soapNoteId
  });

  const deleteTreatment = async (id: number) => {
    try {
      await apiRequest('DELETE', `/api/treatments/${id}`);
      queryClient.invalidateQueries({ queryKey: ['/api/treatments/soap-note', soapNoteId] });
      toast({
        title: "Treatment deleted",
        description: "The treatment has been successfully deleted.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error deleting treatment:', error);
      toast({
        title: "Error",
        description: "Failed to delete treatment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setTreatmentToDelete(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medication':
        return <Pill className="h-4 w-4 mr-1" />;
      case 'procedure':
        return <Stethoscope className="h-4 w-4 mr-1" />;
      case 'surgery':
        return <Syringe className="h-4 w-4 mr-1" />;
      case 'therapy':
        return <Activity className="h-4 w-4 mr-1" />;
      default:
        return <Pill className="h-4 w-4 mr-1" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return <Badge variant="outline" className="flex items-center"><Clock className="h-3 w-3 mr-1" /> Planned</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="flex items-center"><Activity className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case 'completed':
        return <Badge variant="default" className="flex items-center"><Check className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'discontinued':
        return <Badge variant="destructive" className="flex items-center"><AlertCircle className="h-3 w-3 mr-1" /> Discontinued</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center text-destructive">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>Failed to load treatments. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if ((!treatments || treatments.length === 0) && !isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No treatments recorded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {treatments && treatments.map((treatment: Treatment) => (
        <Card key={treatment.id} className="overflow-hidden">
          <CardHeader className="p-4 pb-2 flex flex-row justify-between items-center">
            <div className="flex items-center">
              <CardTitle className="text-md font-semibold flex items-center">
                {getCategoryIcon(treatment.category)}
                {treatment.name}
              </CardTitle>
              <div className="ml-4">
                {getStatusBadge(treatment.status)}
              </div>
            </div>
            {!locked && canEdit && (
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onEditTreatment && onEditTreatment(treatment)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      setTreatmentToDelete(treatment.id);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Administered By:</p>
                <p>{treatment.administeredBy || treatment.practitionerId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date:</p>
                <p>{treatment.administeredDate ? format(new Date(treatment.administeredDate), 'PPP') : 'Not administered yet'}</p>
              </div>
              {treatment.category === 'medication' && (
                <>
                  <div>
                    <p className="text-muted-foreground">Dosage:</p>
                    <p>{treatment.dosage || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Route:</p>
                    <p>{treatment.route || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Frequency:</p>
                    <p>{treatment.frequency || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duration:</p>
                    <p>{treatment.duration || 'N/A'}</p>
                  </div>
                </>
              )}
              {treatment.category === 'procedure' && (
                <>
                  <div>
                    <p className="text-muted-foreground">Procedure Code:</p>
                    <p>{treatment.procedureCode || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location:</p>
                    <p>{treatment.location || 'N/A'}</p>
                  </div>
                </>
              )}
              {treatment.notes && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Notes:</p>
                  <p className="whitespace-pre-wrap">{treatment.notes}</p>
                </div>
              )}
              {treatment.outcome && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Outcome:</p>
                  <p className="whitespace-pre-wrap">{treatment.outcome}</p>
                </div>
              )}
              {treatment.followUpNeeded && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Follow-up:</p>
                  <p>Required by: {treatment.followUpDate ? format(new Date(treatment.followUpDate), 'PPP') : 'No date specified'}</p>
                  {treatment.followUpNotes && (
                    <p className="whitespace-pre-wrap">{treatment.followUpNotes}</p>
                  )}
                </div>
              )}
              {treatment.cost && (
                <div>
                  <p className="text-muted-foreground">Cost:</p>
                  <p>${treatment.cost}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this treatment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the treatment and may 
              update inventory quantities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90" 
              onClick={() => treatmentToDelete && deleteTreatment(treatmentToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}