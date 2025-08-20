import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type ElectronicSignatureType = {
  id: number;
  userId: number;
  signerName: string;
  signerEmail: string;
  signerType: string;
  signatureData: string;
  documentType: string;
  documentId: number;
  practiceId: number;
  documentName: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  signedAt: string;
  createdAt: string;
  metadata?: Record<string, any>;
  verified: boolean;
  verificationMethod?: string;
  verifiedAt?: string;
};

export type CreateSignatureParams = {
  userId: number;
  signerName: string;
  signerEmail: string;
  signerType: string; // CLIENT, STAFF, VETERINARIAN, etc.
  signatureData: string; // Base64 encoded signature data
  documentType: string; // SOAP_NOTE, HEALTH_PLAN, CONSENT_FORM, etc.
  documentId: number;
  practiceId: number;
  documentName: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  metadata?: Record<string, any>;
};

// Get signatures by document type and ID
export function useSignaturesByDocument(documentType: string, documentId: number) {
  return useQuery<ElectronicSignatureType[]>({
    queryKey: ['/api/signatures/document', documentType, documentId],
    enabled: !!documentType && !!documentId,
  });
}

// Get signatures by practice ID
export function useSignaturesByPractice(practiceId: number) {
  return useQuery<ElectronicSignatureType[]>({
    queryKey: ['/api/signatures/practice', practiceId],
    enabled: !!practiceId,
  });
}

// Get signatures by user ID
export function useSignaturesByUser(userId: number) {
  return useQuery<ElectronicSignatureType[]>({
    queryKey: ['/api/signatures/user', userId],
    enabled: !!userId,
  });
}

export function useElectronicSignatures() {
  const { toast } = useToast();

  // Create a new signature
  const createSignatureMutation = useMutation({
    mutationFn: async (signatureData: CreateSignatureParams) => {
      const response = await apiRequest('POST', '/api/signatures', signatureData);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Signature saved successfully",
        description: "The electronic signature has been recorded",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/signatures/document', data.documentType, data.documentId] });
      queryClient.invalidateQueries({ queryKey: ['/api/signatures/practice', data.practiceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/signatures/user', data.userId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save signature",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify a signature
  const verifySignatureMutation = useMutation({
    mutationFn: async ({ id, method }: { id: number; method: string }) => {
      const response = await apiRequest('POST', `/api/signatures/${id}/verify`, { method });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Signature verified",
        description: "The electronic signature has been verified",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/signatures/document', data.documentType, data.documentId] });
      queryClient.invalidateQueries({ queryKey: ['/api/signatures/practice', data.practiceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/signatures/user', data.userId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to verify signature",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete a signature
  const deleteSignatureMutation = useMutation({
    mutationFn: async (id: number) => {
      // First, get the signature details to know which queries to invalidate later
      const response = await apiRequest('GET', `/api/signatures/${id}`);
      const signature = await response.json();
      
      // Delete the signature
      await apiRequest('DELETE', `/api/signatures/${id}`);
      
      return signature;
    },
    onSuccess: (data) => {
      toast({
        title: "Signature deleted",
        description: "The electronic signature has been removed",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/signatures/document', data.documentType, data.documentId] });
      queryClient.invalidateQueries({ queryKey: ['/api/signatures/practice', data.practiceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/signatures/user', data.userId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete signature",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    useSignaturesByDocument,
    useSignaturesByPractice,
    useSignaturesByUser,
    createSignatureMutation,
    verifySignatureMutation,
    deleteSignatureMutation,
  };
}