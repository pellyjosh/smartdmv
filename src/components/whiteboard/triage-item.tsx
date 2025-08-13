import { useState } from "react";
import { Pet, WhiteboardItem } from "@/db/schema";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash, ArrowUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TriageItemProps {
  item: WhiteboardItem;
  pet?: Pet;
  onDragStart: (e: React.DragEvent) => void;
  onUpdate: (data: Partial<WhiteboardItem>) => void;
  onDelete: () => void;
}

export function TriageItem({ item, pet, onDragStart, onUpdate, onDelete }: TriageItemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editNotes, setEditNotes] = useState(item.notes || "");
  const [editUrgency, setEditUrgency] = useState(item.urgency || "medium");

  // Get the appropriate color based on urgency
  const getUrgencyColor = () => {
    switch (item.urgency) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-amber-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-slate-500";
    }
  };

  // Get the display text for the status
  const getStatusDisplay = () => {
    switch (item.status) {
      case "triage":
        return "Triage";
      case "active":
        return "Active";
      case "completed":
        return "Completed";
      default:
        return item.status;
    }
  };

  // Get a formatted time for display
  const getFormattedTime = () => {
    // This would typically use the appointment time in a real implementation
    // For now, let's generate a time based on the item's ID to simulate different times
    const numericId = typeof item.id === 'string' ? parseInt(item.id) : item.id;
    const hour = 8 + (numericId % 12);
    const minute = (numericId * 13) % 60;
    return `${hour}:${minute < 10 ? '0' + minute : minute} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  // Handle saving the edited item
  const handleSaveEdit = () => {
    onUpdate({
      notes: editNotes,
      urgency: editUrgency
    });
    setIsEditDialogOpen(false);
  };

  // Confirm before deleting
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to remove this patient from the whiteboard?")) {
      onDelete();
    }
  };

  return (
    <div 
      className="border border-slate-200 rounded-md p-3 mb-3 cursor-move hover:shadow-sm transition-shadow" 
      draggable
      onDragStart={onDragStart}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full ${getUrgencyColor()}`}></div>
          <span className="ml-2 text-sm font-medium text-slate-800">
            {pet?.name || `Patient ${item.petId}`}
          </span>
        </div>
        <div className="flex items-center">
          <span className="text-xs text-slate-500 mr-2">{getFormattedTime()}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={() => setIsEditDialogOpen(true)}
                className="flex items-center"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onUpdate({ status: "triage" })}
                className="flex items-center"
                disabled={item.status === "triage"}
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Move to Triage
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onUpdate({ status: "active" })}
                className="flex items-center"
                disabled={item.status === "active"}
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Move to Active
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onUpdate({ status: "completed" })}
                className="flex items-center"
                disabled={item.status === "completed"}
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Move to Completed
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete}
                className="flex items-center text-red-600 hover:text-red-700 focus:text-red-700"
              >
                <Trash className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="text-xs text-slate-500 mt-1">
        {item.status === "active" ? "Active Treatment" : 
         item.status === "completed" ? "Completed" : 
         getStatusDisplay()} • {pet?.species || "Unknown"}
        {pet?.breed ? ` • ${pet.breed}` : ""}
      </div>
      
      {item.notes && (
        <div className="mt-2 text-xs bg-slate-50 p-1.5 rounded-sm text-slate-600">
          {item.notes}
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <Label htmlFor="edit-patient">Patient</Label>
                <p className="mt-1 text-sm font-medium">
                  {pet?.name || `Patient ${item.petId}`} ({pet?.species} {pet?.breed ? `• ${pet.breed}` : ""})
                </p>
              </div>
              
              <div className="flex-1">
                <Label htmlFor="edit-status">Current Status</Label>
                <p className="mt-1 text-sm font-medium">
                  {getStatusDisplay()}
                </p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-urgency">Urgency</Label>
              <Select 
                value={editUrgency} 
                onValueChange={(value) => setEditUrgency(value as "high" | "medium" | "low" | "none")}
              >
                <SelectTrigger id="edit-urgency">
                  <SelectValue placeholder="Select urgency level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea 
                id="edit-notes" 
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={4}
                placeholder="Enter additional notes or information"
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
