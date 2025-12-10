import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { WidgetConfig } from "@/hooks/use-dashboard-config";
import { WhiteboardItem } from "@/schemas/whiteboard-item";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WhiteboardWidgetProps {
  widget: WidgetConfig;
}

export function WhiteboardWidget({ widget }: WhiteboardWidgetProps) {
  const { data: whiteboardItems, isLoading: loadingItems } = useQuery<
    WhiteboardItem[]
  >({
    queryKey: ["/api/whiteboard"],
  });

  const [expanded, setExpanded] = useState(false);

  const sizeMap: Record<"small" | "medium" | "large", string> = {
    small: "h-48",
    medium: "h-72",
    large: "h-96",
  };
  const containerClass = expanded
    ? "space-y-3"
    : `${sizeMap[widget.size]} overflow-y-auto space-y-3`;

  const isLoading = loadingItems;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!whiteboardItems || whiteboardItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No whiteboard items
      </div>
    );
  }

  // Filter to show only active items and sort by urgency
  const sortedActive = whiteboardItems
    .filter((item) => item.status === "active")
    .sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      return (
        (urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 3) -
        (urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 3)
      );
    });

  const filteredItems = sortedActive;

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No active whiteboard items
      </div>
    );
  }

  const getUrgencyColor = (urgency: string | null) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className={containerClass}>
      {filteredItems.map((item) => (
        <div key={item.id} className="p-2 border rounded-md">
          <div className="flex justify-between items-start">
            <div className="font-medium">{item.petId}</div>
            {item.urgency && (
              <Badge className={getUrgencyColor(item.urgency)}>
                {item.urgency}
              </Badge>
            )}
          </div>
          {item.notes && (
            <div className="text-sm text-muted-foreground mt-1">
              {item.notes}
            </div>
          )}
        </div>
      ))}
      {sortedActive.length > 5 && (
        <div className="pt-2 border-t">
          <button
            className="w-full text-xs text-primary hover:underline"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>
      )}
    </div>
  );
}
