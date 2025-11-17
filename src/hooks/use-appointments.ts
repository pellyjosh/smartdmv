/**
 * Hybrid Appointments Hook
 * 
 * Intelligently switches between online API and offline IndexedDB based on network status.
 * - When ONLINE: Uses standard React Query with API routes
 * - When OFFLINE: Uses IndexedDB with automatic sync queue
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { useRef, useEffect } from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useOfflineAppointments } from "@/hooks/offline/appointments";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { SelectAppointment } from "@/db/schema";

// Use database schema type for consistency
export type { SelectAppointment as Appointment } from "@/db/schema";

interface AppointmentFormValues {
  title: string;
  type: string;
  date: Date;
  duration: number;
  petId: string;
  practitionerId: string;
  practiceId?: string;
  notes?: string;
  status?: string;
}

// Transform form data to match schema
function transformFormToSchema(formData: AppointmentFormValues): any {
  return {
    title: formData.title,
    type: formData.type,
    date: formData.date,
    durationMinutes: formData.duration.toString(),
    petId: formData.petId,
    practitionerId: formData.practitionerId,
    practiceId: formData.practiceId,
    notes: formData.notes,
    status: formData.status || 'pending',
  };
}

export function useAppointments() {
  const { isOnline } = useNetworkStatus();
  const { userPracticeId } = useUser();
  const { toast } = useToast();

  // Keep a ref to the current network status to avoid closure issues
  const isOnlineRef = useRef(isOnline);
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  // Offline hook (always initialized, but only used when offline)
  const offlineHook = useOfflineAppointments();

  // Online query (only enabled when online)
  const onlineQuery = useQuery<SelectAppointment[]>({
    queryKey: ["/api/appointments"],
    enabled: isOnline,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/appointments?practiceId=${userPracticeId}`
      );
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
  });

  // Online mutation for creating appointments
  const onlineCreateMutation = useMutation({
    networkMode: 'always', // Execute mutation even when offline is detected
    mutationFn: async (data: AppointmentFormValues) => {
      // Use ref for current network status to avoid closure stale state
      const currentNetworkStatus = isOnlineRef.current && navigator.onLine;
      
      if (!currentNetworkStatus) {
        // Network went offline, use offline hook instead
        const transformedData = transformFormToSchema(data);
        return offlineHook.createAppointment(transformedData);
      }
      
      const transformedData = transformFormToSchema(data);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transformedData),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`${res.status}: ${errorText}`);
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment created",
        description: "The appointment has been successfully created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create appointment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Online mutation for updating appointments
  const onlineUpdateMutation = useMutation({
    networkMode: 'always', // Execute mutation even when offline is detected
    mutationFn: async ({ id, data }: { id: string; data: Partial<AppointmentFormValues> }) => {
      // Use ref for current network status to avoid closure stale state
      const currentNetworkStatus = isOnlineRef.current && navigator.onLine;
      
      if (!currentNetworkStatus) {
        // Network went offline, use offline hook instead
        const transformedData = transformFormToSchema(data as AppointmentFormValues);
        return offlineHook.updateAppointment(id, transformedData);
      }
      
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`${res.status}: ${errorText}`);
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment updated",
        description: "The appointment has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update appointment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Online mutation for deleting appointments
  const onlineDeleteMutation = useMutation({
    networkMode: 'always', // Execute mutation even when offline is detected
    mutationFn: async (id: string) => {
      // Use ref for current network status to avoid closure stale state
      const currentNetworkStatus = isOnlineRef.current && navigator.onLine;
      
      if (!currentNetworkStatus) {
        // Network went offline, use offline hook instead
        return offlineHook.deleteAppointment(id);
      }
      
      const res = await fetch(`/api/appointments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`${res.status}: ${errorText}`);
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment deleted",
        description: "The appointment has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete appointment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Return unified interface that works in both online and offline modes
  // The mutations themselves handle the network status check
  return {
    // Data - prefer online when available, fallback to offline
    appointments: isOnline ? (onlineQuery.data || []) : (offlineHook.appointments.map((apt: any) => ({
      ...apt,
      id: apt.id ? Number(apt.id) : undefined,
      date: apt.date || new Date(apt.appointmentDate),
    })) as any[]),
    isLoading: isOnline ? onlineQuery.isLoading : offlineHook.isLoading,
    error: isOnline ? onlineQuery.error : offlineHook.error,
    
    // Actions - always use the online mutations which fallback to offline when needed
    createAppointment: async (data: AppointmentFormValues) => {
      return onlineCreateMutation.mutateAsync(data);
    },
    updateAppointment: async (id: string, data: Partial<AppointmentFormValues>) => {
      return onlineUpdateMutation.mutateAsync({ id, data });
    },
    deleteAppointment: async (id: string) => {
      return onlineDeleteMutation.mutateAsync(id);
    },
    getAppointment: (id: string) => {
      if (isOnline) {
        return onlineQuery.data?.find(apt => String(apt.id) === id);
      } else {
        return offlineHook.getAppointment(id);
      }
    },
    
    // Status
    isOnline,
    pendingCount: isOnline ? 0 : offlineHook.pendingCount,
    syncedCount: isOnline ? (onlineQuery.data?.length || 0) : offlineHook.syncedCount,
    errorCount: isOnline ? 0 : offlineHook.errorCount,
    
    // Sync actions
    syncNow: async () => {
      if (isOnline) {
        await onlineQuery.refetch();
      } else {
        await offlineHook.syncNow();
      }
    },
    refresh: async () => {
      if (isOnline) {
        await onlineQuery.refetch();
      } else {
        await offlineHook.refresh();
      }
    },
  };
}
