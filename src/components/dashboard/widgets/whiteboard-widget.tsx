import { useQuery } from "@tanstack/react-query";
import { WidgetConfig } from "@/hooks/use-dashboard-config";
import { WhiteboardItem, Pet } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WhiteboardWidgetProps {
  widget: WidgetConfig;
}

export function WhiteboardWidget({ widget }: WhiteboardWidgetProps) {
  const { data: whiteboardItems, isLoading: loadingItems } = useQuery<WhiteboardItem[]>({
    queryKey: ['/api/whiteboard'],
  });

  const { data: pets, isLoading: loadingPets } = useQuery<Pet[]>({
    queryKey: ['/api/pets'],
  });

  const isLoading = loadingItems || loadingPets;

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
  const filteredItems = whiteboardItems
    .filter(item => item.status === "active")
    .sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      return (urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 3) - 
             (urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 3);
    })
    .slice(0, 5); // Show only the first 5

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No active whiteboard items
      </div>
    );
  }

  const getPetName = (petId: number) => {
    const pet = pets?.find(p => p.id === petId);
    return pet ? pet.name : "Unknown Pet";
  };

  const getUrgencyColor = (urgency: string | null) => {
    switch (urgency) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-3">
      {filteredItems.map((item) => (
        <div
          key={item.id}
          className="p-2 border rounded-md"
        >
          <div className="flex justify-between items-start">
            <div className="font-medium">{getPetName(item.petId)}</div>
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
    </div>
  );
}