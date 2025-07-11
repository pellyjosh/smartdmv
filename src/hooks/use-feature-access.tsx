'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest, getQueryFn, queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/context/UserContext';

interface FeatureAccessContextType {
  availableFeatures: string[];
  isLoading: boolean;
  error: Error | null;
  checkAccess: (featureId: string) => Promise<boolean>;
  refreshFeatures: () => void;
}

const FeatureAccessContext = createContext<FeatureAccessContextType | null>(null);

interface FeatureAccessProviderProps {
  children: ReactNode;
}

export function FeatureAccessProvider({ children }: FeatureAccessProviderProps) {
  const { user } = useUser();
  const [error, setError] = useState<Error | null>(null);
  
  const {
    data: availableFeatures = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['/api/features/available'],
    queryFn: getQueryFn({
      on401: 'returnNull'
    }) as () => Promise<any>,
    select: (data: any) => {
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    },
    enabled: !!user, // Only fetch when user is authenticated
  });
  
  // Function to check if user has access to a specific feature
  const checkAccess = async (featureId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // First check the cached features for a quick response
      if (availableFeatures.includes(featureId)) {
        return true;
      }
      
      // If not in cache, make a direct API call
      const response = await apiRequest('GET', `/api/features/check/${featureId}`);
      const data = await response.json();
      return data.hasAccess;
    } catch (err) {
      console.error(`Error checking access for feature ${featureId}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  };
  
  // Function to refresh the features cache
  const refreshFeatures = () => {
    if (!user) return;
    refetch();
  };
  
  return (
    <FeatureAccessContext.Provider
      value={{
        availableFeatures,
        isLoading,
        error,
        checkAccess,
        refreshFeatures
      }}
    >
      {children}
    </FeatureAccessContext.Provider>
  );
}

export function useFeatureAccess(featureId?: string) {
  const context = useContext(FeatureAccessContext);
  
  if (!context) {
    throw new Error('useFeatureAccess must be used within a FeatureAccessProvider');
  }
  
  const { availableFeatures, isLoading, error, checkAccess } = context;
  
  // State to track access for a specific feature
  const [specificFeatureAccess, setSpecificFeatureAccess] = useState<{
    hasAccess: boolean;
    isLoading: boolean;
    error: Error | null;
  }>({ hasAccess: false, isLoading: true, error: null });
  
  // If a specific featureId is provided, check access for that feature
  useEffect(() => {
    // Reset on new feature request
    if (featureId) {
      setSpecificFeatureAccess(prev => ({ ...prev, isLoading: true }));
      
      // Check if it's in the available features cache first
      if (!isLoading) {
        const hasAccessFromCache = availableFeatures.includes(featureId);
        
        if (hasAccessFromCache) {
          setSpecificFeatureAccess({
            hasAccess: true,
            isLoading: false,
            error: null
          });
        } else {
          // If not in cache, make an API call to check
          (async () => {
            try {
              const hasAccess = await checkAccess(featureId);
              setSpecificFeatureAccess({
                hasAccess,
                isLoading: false,
                error: null
              });
              
              // If we have new access information, refresh the features list
              if (hasAccess && !availableFeatures.includes(featureId)) {
                queryClient.invalidateQueries({ queryKey: ['/api/features/available'] });
              }
            } catch (err) {
              console.error(`Error in useFeatureAccess for feature ${featureId}:`, err);
              setSpecificFeatureAccess({
                hasAccess: false,
                isLoading: false,
                error: err instanceof Error ? err : new Error(String(err))
              });
            }
          })();
        }
      }
    }
  }, [featureId, isLoading, availableFeatures, checkAccess]);
  
  // If a specific featureId is provided, return specific access info
  if (featureId) {
    return specificFeatureAccess;
  }
  
  // Otherwise, return the general features context
  return {
    availableFeatures,
    isLoading,
    error
  };
}

// Debug helper to log feature access
export function logFeatureAccess(featureId: string, hasAccess: boolean) {
  console.log(`Feature access check for ${featureId}: ${hasAccess ? 'ALLOWED' : 'DENIED'}`);
}
