import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LabResultsList } from "./lab-results-list";
import { PlusCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface LabResultsSelectorProps {
  petId: string;
  soapNoteId: number;
  section: "subjective" | "objective" | "assessment" | "plan";
  onResultsAdded?: () => void;
}

export function LabResultsSelector({
  petId,
  soapNoteId,
  section,
  onResultsAdded
}: LabResultsSelectorProps) {
  const [open, setOpen] = useState(false);
  const [highlightAbnormal, setHighlightAbnormal] = useState(true);
  const [notes, setNotes] = useState("");

  const handleAddResults = () => {
    // This function is called after results have been linked to the SOAP note
    if (onResultsAdded) {
      onResultsAdded();
    }
    setOpen(false);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-2">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Lab Results
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Lab Results to {section ? section.charAt(0).toUpperCase() + section.slice(1) : ''} Section</DialogTitle>
          <DialogDescription>
            Select lab results to include in this section of the SOAP note.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          {/* Additional options */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="highlight-abnormal" 
              checked={highlightAbnormal}
              onCheckedChange={() => setHighlightAbnormal(!highlightAbnormal)}
            />
            <Label htmlFor="highlight-abnormal">Highlight abnormal results</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="result-notes">Notes</Label>
            <Textarea 
              id="result-notes"
              placeholder="Add any notes about these lab results..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          
          {/* Lab results list with selection */}
          <LabResultsList 
            petId={petId}
            soapNoteId={soapNoteId}
            onSelectResults={handleAddResults}
            section={section}
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}