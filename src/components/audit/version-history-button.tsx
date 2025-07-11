'use client';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { VersionHistory } from "./version-history";

type RecordType = "soap_note" | "lab_result" | "prescription" | "vaccination" | "treatment" | "health_plan";

interface VersionHistoryButtonProps {
  recordId: number;
  recordType: RecordType;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function VersionHistoryButton({
  recordId,
  recordType,
  variant = "outline",
  size = "sm",
  className
}: VersionHistoryButtonProps) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowHistory(true)}
        className={className}
      >
        <History className="h-4 w-4 mr-2" />
        Version History
      </Button>

      <VersionHistory
        recordId={recordId}
        recordType={recordType}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
}