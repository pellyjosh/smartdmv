"use client";
import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/context/UserContext";

interface Practice {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  email?: string;
  phone?: string;
  organizationId: number;
  logoPath?: string | null;
  status?: string;
  isHeadOffice?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
  primaryColor?: string;
}

interface PracticeContextType {
  practice: Practice | null;
  isLoading: boolean;
  error: Error | null;
  isMultiLocationEnabled: boolean;
  switchPractice: (practiceId: string) => void;
  availablePractices: Practice[];
  practicesLoading: boolean;
  uploadLogo: (practiceId: number, file: File) => void;
  isUploading: boolean;
  updatePractice: (practiceId: number, data: Partial<Practice>) => void;
  updatePracticeAsync?: (
    practiceId: number,
    data: Partial<Practice>
  ) => Promise<any>;
  isUpdating: boolean;
}

const PracticeContext = createContext<PracticeContextType | null>(null);

export const PracticeProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { user, userPracticeId } = useUser();
  const [isMultiLocationEnabled, setIsMultiLocationEnabled] = useState(false);

  // Fetch the current practice
  const {
    data: practice,
    error,
    isLoading,
    refetch: refetchPractice,
  } = useQuery<Practice>({
    queryKey: ["/api/practices", userPracticeId],
    enabled: !!userPracticeId,
    queryFn: async () => {
      console.log("Fetching practice with ID:", userPracticeId);
      const response = await fetch(`/api/practices/${userPracticeId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch practice: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Fetched practice data:", data);
      return data;
    },
  });

  // Fetch available practices for the current user
  const {
    data: availablePractices = [],
    isLoading: practicesLoading,
    refetch: refetchPractices,
  } = useQuery<Practice[]>({
    queryKey: ["/api/user-practices"],
    queryFn: async () => {
      const res = await fetch("/api/user-practices", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch user practices");
      return res.json();
    },
    enabled: !!user,
  });

  // Check if multi-location is enabled
  useEffect(() => {
    if (availablePractices && availablePractices.length > 1) {
      setIsMultiLocationEnabled(true);
    } else {
      setIsMultiLocationEnabled(false);
    }
  }, [availablePractices]);

  // Mutation to switch practice
  const switchPracticeMutation = useMutation({
    mutationFn: async (practiceId: string) => {
      if (practiceId === userPracticeId) return; // No change needed
      await apiRequest("POST", "/api/switch-practice", { practiceId });
    },
    onSuccess: () => {
      // Invalidate relevant queries - auth state is handled by UserContext
      queryClient.invalidateQueries({ queryKey: ["/api/practices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });

      toast({
        title: "Location Switched",
        description: "Successfully switched to the selected location.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Switch Location",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to upload logo
  const uploadLogoMutation = useMutation({
    mutationFn: async ({
      practiceId,
      file,
    }: {
      practiceId: number;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch(`/api/practices/${practiceId}/logo`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload logo");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Logo Uploaded",
        description: "Practice logo has been successfully updated.",
      });

      // Invalidate relevant queries to refresh practice data
      queryClient.invalidateQueries({ queryKey: ["/api/practices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-practices"] });

      // Explicitly refetch the current practice and practices list
      refetchPractice();
      refetchPractices();
    },
    onError: (error: Error) => {
      toast({
        title: "Logo Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to update practice details
  const updatePracticeMutation = useMutation({
    mutationFn: async ({
      practiceId,
      data,
    }: {
      practiceId: number;
      data: Partial<Practice>;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/practices/${practiceId}`,
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Practice Updated",
        description: "Practice details have been successfully updated.",
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/practices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-practices"] });

      // Explicitly refetch the current practice and practices list
      refetchPractice();
      refetchPractices();
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const switchPractice = (practiceId: string) => {
    switchPracticeMutation.mutate(practiceId);
  };

  const uploadLogo = (practiceId: number, file: File) => {
    uploadLogoMutation.mutate({ practiceId, file });
  };

  const updatePractice = (practiceId: number, data: Partial<Practice>) => {
    updatePracticeMutation.mutate({ practiceId, data });
  };

  const updatePracticeAsync = (practiceId: number, data: Partial<Practice>) => {
    return updatePracticeMutation.mutateAsync({ practiceId, data });
  };

  return (
    <PracticeContext.Provider
      value={{
        practice: practice || null,
        isLoading,
        error,
        isMultiLocationEnabled,
        switchPractice,
        availablePractices,
        practicesLoading,
        uploadLogo,
        isUploading: uploadLogoMutation.isPending,
        updatePractice,
        updatePracticeAsync,
        isUpdating: updatePracticeMutation.isPending,
      }}
    >
      {children}
    </PracticeContext.Provider>
  );
};

export const usePractice = () => {
  const context = useContext(PracticeContext);
  if (!context) {
    throw new Error("usePractice must be used within a PracticeProvider");
  }
  return context;
};
