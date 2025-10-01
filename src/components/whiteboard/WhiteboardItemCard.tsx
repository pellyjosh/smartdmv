// src/components/whiteboard/WhiteboardItemCard.tsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  User,
  AlertTriangle,
  Trash2,
  Calendar,
  FileText,
} from "lucide-react";
import {
  getStatusLabel,
  getStatusColor,
  type AppointmentStatus,
  type WhiteboardStatus,
  type UrgencyLevel,
} from "@/lib/appointment-workflow";

interface Pet {
  id: number;
  name: string;
  species: string;
  breed?: string;
}

interface WhiteboardItemCardProps {
  item: {
    id: number;
    petId: number;
    status: WhiteboardStatus;
    urgency: UrgencyLevel | null;
    notes?: string | null;
    appointmentId?: number | null;
    position: number;
    practiceId: number;
    assignedToId?: number | null;
    location?: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    isAppointment?: boolean;
    originalAppointmentStatus?: AppointmentStatus;
    pet?: Pet;
  };
  onDelete?: (id: number) => void;
  isDragging?: boolean;
}

export const WhiteboardItemCard: React.FC<WhiteboardItemCardProps> = ({
  item,
  onDelete,
  isDragging = false,
}) => {
  const urgencyLevel = (item.urgency || "none") as UrgencyLevel;

  const urgencyColors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-green-100 text-green-800 border-green-200",
    none: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const urgencyIcons = {
    high: <AlertTriangle className="h-3 w-3" />,
    medium: <Clock className="h-3 w-3" />,
    low: <Clock className="h-3 w-3" />,
    none: null,
  };

  const statusColors = item.originalAppointmentStatus
    ? getStatusColor(item.originalAppointmentStatus)
    : { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" };

  return (
    <Card
      className={`cursor-move transition-all duration-200 hover:shadow-md ${
        isDragging ? "opacity-50 scale-95" : ""
      }`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("itemId", item.id.toString());
      }}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Pet Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-slate-500" />
              <span className="font-medium text-slate-900">
                {item.pet?.name || (item as any).petName || "Unknown Pet"}
              </span>
            </div>

            {/* Urgency Badge */}
            {urgencyLevel !== "none" && (
              <Badge className={`text-xs ${urgencyColors[urgencyLevel]}`}>
                {urgencyIcons[urgencyLevel]}
                <span className="ml-1 capitalize">{urgencyLevel}</span>
              </Badge>
            )}
          </div>

          {/* Pet Details */}
          {item.pet && (
            <div className="text-xs text-slate-500">
              {item.pet.species} {item.pet.breed && `• ${item.pet.breed}`}
            </div>
          )}

          {/* Appointment vs Manual Item Indicator */}
          <div className="flex items-center justify-between">
            {item.isAppointment ? (
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-blue-600">Appointment</span>
                {item.originalAppointmentStatus && (
                  <Badge
                    className={`text-xs ${statusColors.bg} ${statusColors.text}`}
                  >
                    {getStatusLabel(item.originalAppointmentStatus)}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <FileText className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">Manual Entry</span>
              </div>
            )}

            {/* Delete Button (only for manual entries) */}
            {!item.isAppointment && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border">
              {item.notes}
            </div>
          )}

          {/* Location */}
          {item.location && (
            <div className="text-xs text-slate-500">📍 {item.location}</div>
          )}

          {/* Timestamp */}
          <div className="text-xs text-slate-400">
            {item.isAppointment ? "Appointment" : "Added"}:{" "}
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhiteboardItemCard;
