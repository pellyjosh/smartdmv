import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  MoreHorizontal,
  FilePenLine,
  Trash2,
  SquareCheck,
  Calendar,
  User,
  Eye,
} from "lucide-react";
import { formatDistanceToNow, isPast, differenceInDays } from "date-fns";
import EditChecklistDialog from "./edit-checklist-dialog";
import ViewChecklistDialog from "./view-checklist-dialog";
import { UserRoleEnum } from "@/lib/db-types";
import { useUser } from "@/context/UserContext";
import { getInitials, getAvatarColorFromName } from "@/lib/utils";

export default function AssignedChecklistsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [checklistToEdit, setChecklistToEdit] = useState<any>(null);
  const [checklistToView, setChecklistToView] = useState<any>(null);
  const [checklistToDelete, setChecklistToDelete] = useState<any>(null);
  const [checklistToComplete, setChecklistToComplete] = useState<any>(null);

  // Staff can see all checklists for the practice
  // Clients/pet owners can only see their own pet's checklists
  const apiEndpoint =
    user?.role === UserRoleEnum.CLIENT
      ? "/api/client-portal/checklists"
      : "/api/assigned-checklists";

  type ChecklistSummary = {
    id: number;
    name: string;
    status: "pending" | "in_progress" | "completed" | "cancelled";
    priority: "low" | "medium" | "high" | "urgent" | null;
    dueDate?: string | null;
    items?: Array<{ id: number; completed: boolean }>;
    petName: string;
    petSpecies?: string | null;
  };

  const { data: checklists = [], isLoading } = useQuery<ChecklistSummary[]>({
    queryKey: [apiEndpoint],
    queryFn: async () => {
      const res = await apiRequest("GET", apiEndpoint);
      return res.json();
    },
    staleTime: 30000, // 30 seconds
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/assigned-checklists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      toast({
        title: "Checklist deleted",
        description: "The treatment checklist has been deleted successfully.",
      });
      setChecklistToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting checklist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/assigned-checklists/${id}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      toast({
        title: "Checklist completed",
        description: "The treatment checklist has been marked as completed.",
      });
      setChecklistToComplete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error completing checklist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (checklistToDelete) {
      deleteMutation.mutate(checklistToDelete.id);
    }
  };

  const handleComplete = () => {
    if (checklistToComplete) {
      completeMutation.mutate(checklistToComplete.id);
    }
  };

  const getStatusBadge = (status: string, dueDate?: string | null) => {
    if (status === "completed") {
      return <Badge className="bg-green-500">Completed</Badge>;
    }

    if (status === "in_progress") {
      return <Badge variant="secondary">In Progress</Badge>;
    }

    if (dueDate && isPast(new Date(dueDate))) {
      return <Badge variant="destructive">Overdue</Badge>;
    }

    if (dueDate && differenceInDays(new Date(dueDate), new Date()) <= 2) {
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-500">
          Due Soon
        </Badge>
      );
    }

    return <Badge variant="outline">Pending</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const map: Record<string, JSX.Element> = {
      urgent: <Badge variant="destructive">Urgent</Badge>,
      high: <Badge className="bg-orange-500">High</Badge>,
      medium: <Badge variant="secondary">Medium</Badge>,
      low: <Badge variant="outline">Low</Badge>,
    };
    return map[priority] || map["medium"];
  };

  const getProgressPercentage = (checklist: any) => {
    if (!checklist.items || checklist.items.length === 0) return 0;
    const completedItems = checklist.items.filter(
      (item: any) => item.completed
    ).length;
    return Math.round((completedItems / checklist.items.length) * 100);
  };

  // Only certain roles can manage checklists
  const canManageChecklists =
    user?.role === UserRoleEnum.PRACTICE_ADMINISTRATOR ||
    user?.role === UserRoleEnum.SUPER_ADMIN ||
    user?.role === UserRoleEnum.VETERINARIAN ||
    user?.role === UserRoleEnum.ADMINISTRATOR;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (checklists.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No treatment checklists found. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pet</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {checklists.map((checklist: any) => (
            <TableRow key={checklist.id}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Avatar
                    className="h-8 w-8"
                    style={{
                      backgroundColor: getAvatarColorFromName(
                        checklist.petName
                      ),
                    }}
                  >
                    <AvatarFallback>
                      {getInitials(checklist.petName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{checklist.petName}</div>
                    <div className="text-xs text-muted-foreground">
                      {checklist.petSpecies}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-medium">{checklist.name}</TableCell>
              <TableCell>
                {getStatusBadge(checklist.status, checklist.dueDate)}
              </TableCell>
              <TableCell>
                {getPriorityBadge(checklist.priority || "medium")}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <Progress
                    value={getProgressPercentage(checklist)}
                    className="h-2"
                  />
                  <span className="text-xs text-muted-foreground">
                    {`${
                      checklist.items?.filter((i: any) => i.completed).length ||
                      0
                    }/${checklist.items?.length || 0} tasks`}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {checklist.dueDate ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatDistanceToNow(new Date(checklist.dueDate), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">No due date</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setChecklistToView(checklist)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {canManageChecklists && (
                      <DropdownMenuItem
                        onClick={() => setChecklistToEdit(checklist)}
                      >
                        <FilePenLine className="mr-2 h-4 w-4" />
                        Edit Checklist
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => setChecklistToComplete(checklist)}
                    >
                      <SquareCheck className="mr-2 h-4 w-4" />
                      Mark as Completed
                    </DropdownMenuItem>
                    {canManageChecklists && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setChecklistToDelete(checklist)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {checklistToEdit && (
        <EditChecklistDialog
          checklist={checklistToEdit}
          open={!!checklistToEdit}
          onOpenChange={(open) => !open && setChecklistToEdit(null)}
        />
      )}

      {checklistToView && (
        <ViewChecklistDialog
          checklist={checklistToView}
          open={!!checklistToView}
          onOpenChange={(open) => !open && setChecklistToView(null)}
        />
      )}

      <AlertDialog
        open={!!checklistToDelete}
        onOpenChange={(open) => !open && setChecklistToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              checklist and all of its tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!checklistToComplete}
        onOpenChange={(open) => !open && setChecklistToComplete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this entire checklist as completed?
              {checklistToComplete &&
                getProgressPercentage(checklistToComplete) < 100 && (
                  <span className="block mt-2 text-amber-500 font-medium">
                    Warning: Not all tasks in this checklist have been
                    completed.
                  </span>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700"
            >
              Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
