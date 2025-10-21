import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ServiceCodeViewDialog({
  code,
  open,
  onOpenChange,
}: any) {
  if (!code) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Service Code: {code.code}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <div className="text-sm text-muted-foreground">Description</div>
            <div className="font-medium">{code.description}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Category</div>
            <div className="font-medium">{code.category}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Default Price</div>
            <div className="font-medium">
              ${parseFloat(code.defaultPrice || "0").toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Taxable</div>
            <div className="font-medium">
              {code.taxable === "yes" ? "Yes" : "No"}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
