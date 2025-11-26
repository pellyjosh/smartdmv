import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { indexedDBManager } from "@/lib/offline/db";

export type CustomFieldCategory = {
  id: number;
  name: string;
  key: string;
  description: string | null;
  isSystem: boolean;
  practiceId: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CustomFieldGroup = {
  id: number;
  name: string;
  key: string;
  description: string | null;
  isSystem: boolean;
  categoryId: number;
  practiceId: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CustomFieldValue = {
  id: number;
  value: string;
  label: string;
  groupId: number;
  practiceId: number;
  isActive: boolean;
  sortOrder: number;
  isDefault: boolean;
  isSystem: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CustomFieldDependency = {
  id: number;
  parentGroupId: number;
  childGroupId: number;
  parentValueId: number | null;
  filterType: "show_when_selected" | "hide_when_selected" | "filter_values";
  practiceId: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CustomFieldAuditLog = {
  id: number;
  entityType: "category" | "group" | "value" | "dependency";
  entityId: number;
  action: "create" | "update" | "delete" | "activate" | "deactivate";
  userId: number;
  practiceId: number;
  previousValue: any | null;
  newValue: any | null;
  timestamp: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
};

/**
 * Custom hook for accessing and managing custom fields
 */
export function useCustomFields() {
  const { user, userPracticeId } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const practiceId = userPracticeId || indexedDBManager.getCurrentTenant().practiceId || undefined;

  // Fetch all categories for the current practice
  const { 
    data: categories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError,
    refetch: refetchCategories
  } = useQuery({
    queryKey: [`/api/custom-fields/categories/practice/${practiceId}`, practiceId],
    enabled: !!practiceId,
    queryFn: async () => {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        try {
          const { indexedDBManager } = await import('@/lib/offline/db');
          const cached = (await indexedDBManager.get('cache', `custom_fields_${practiceId}`)) as any;
          const arr = Array.isArray(cached?.data?.categories) ? cached.data.categories : [];
          return arr;
        } catch {
          return [];
        }
      }
      const res = await apiRequest("GET", `/api/custom-fields/categories/practice/${practiceId}`);
      return await res.json();
    }
  });

  // Fetch all groups for the current practice
  const {
    data: groups = [],
    isLoading: isGroupsLoading,
    error: groupsError,
    refetch: refetchGroups
  } = useQuery({
    queryKey: [`/api/custom-fields/groups/practice/${practiceId}`, practiceId],
    enabled: !!practiceId,
    queryFn: async () => {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        try {
          const { indexedDBManager } = await import('@/lib/offline/db');
          const cached = (await indexedDBManager.get('cache', `custom_fields_${practiceId}`)) as any;
          const arr = Array.isArray(cached?.data?.groups) ? cached.data.groups : [];
          return arr;
        } catch {
          return [];
        }
      }
      const res = await apiRequest("GET", `/api/custom-fields/groups/practice/${practiceId}`);
      return await res.json();
    }
  });

  // Fetch all values for the current practice
  const {
    data: values = [],
    isLoading: isValuesLoading,
    error: valuesError,
    refetch: refetchValues
  } = useQuery({
    queryKey: [`/api/custom-fields/values/practice/${practiceId}`, practiceId],
    enabled: !!practiceId,
    queryFn: async () => {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        try {
          const { indexedDBManager } = await import('@/lib/offline/db');
          const cached = (await indexedDBManager.get('cache', `custom_fields_${practiceId}`)) as any;
          const arr = Array.isArray(cached?.data?.values) ? cached.data.values : [];
          return arr;
        } catch {
          return [];
        }
      }
      const res = await apiRequest("GET", `/api/custom-fields/values/practice/${practiceId}`);
      return await res.json();
    }
  });

  // Fetch all dependencies for the current practice
  const {
    data: dependencies = [],
    isLoading: isDependenciesLoading,
    error: dependenciesError,
    refetch: refetchDependencies
  } = useQuery({
    queryKey: [`/api/custom-fields/dependencies/practice/${practiceId}`, practiceId],
    enabled: !!practiceId,
    queryFn: async () => {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        try {
          const { indexedDBManager } = await import('@/lib/offline/db');
          const cached = (await indexedDBManager.get('cache', `custom_fields_${practiceId}`)) as any;
          const arr = Array.isArray(cached?.data?.dependencies) ? cached.data.dependencies : [];
          return arr;
        } catch {
          return [];
        }
      }
      const res = await apiRequest("GET", `/api/custom-fields/dependencies/practice/${practiceId}`);
      return await res.json();
    }
  });

  // Fetch audit logs for the current practice
  const {
    data: auditLogs = [],
    isLoading: isAuditLogsLoading,
    error: auditLogsError,
    refetch: refetchAuditLogs
  } = useQuery({
    queryKey: [`/api/custom-fields/audit-logs/practice/${practiceId}`, practiceId],
    enabled: !!practiceId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/custom-fields/audit-logs/practice/${practiceId}`);
      return await res.json();
    }
  });

  // Create dependency mutation
  const createDependencyMutation = useMutation({
    mutationFn: async (dependency: Omit<CustomFieldDependency, 'id' | 'createdAt' | 'updatedAt'>) => {
      const res = await apiRequest("POST", "/api/custom-fields/dependencies", dependency);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Dependency created",
        description: "Field dependency has been created successfully",
      });
      invalidateCustomFieldQueries();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create dependency",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update dependency mutation
  const updateDependencyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Omit<CustomFieldDependency, 'id' | 'createdAt' | 'updatedAt'>> }) => {
      const res = await apiRequest("PUT", `/api/custom-fields/dependencies/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Dependency updated",
        description: "Field dependency has been updated successfully",
      });
      invalidateCustomFieldQueries();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update dependency",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete dependency mutation
  const deleteDependencyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/custom-fields/dependencies/${id}`);
      // The server returns 204 No Content on success, so we don't try to parse JSON
      return { success: res.status === 204 };
    },
    onSuccess: () => {
      toast({
        title: "Dependency deleted",
        description: "Field dependency has been deleted successfully",
      });
      invalidateCustomFieldQueries();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete dependency",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create audit log mutation
  const createAuditLogMutation = useMutation({
    mutationFn: async (log: Omit<CustomFieldAuditLog, 'id' | 'timestamp'>) => {
      const res = await apiRequest("POST", "/api/custom-fields/audit-logs", log);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/custom-fields/audit-logs/practice/${practiceId}`, practiceId] });
    },
    onError: (error: Error) => {
      console.error("Failed to create audit log:", error);
    },
  });

  // Helper to find a group by key
  const getGroupByKey = (key: string): CustomFieldGroup | undefined => {
    return groups.find((group: CustomFieldGroup) => group.key === key);
  };

  // Helper to get values for a specific group
  const getValuesByGroupKey = (groupKey: string): CustomFieldValue[] => {
    const group = getGroupByKey(groupKey);
    console.log(`Getting group by key: ${groupKey}`, group);
    
    if (!group) {
      console.log(`No group found with key ${groupKey}`);
      return [];
    }
    
    // Ensure values is an array
    const valuesArray = Array.isArray(values) ? values : [];
    console.log(`Getting values for group key ${groupKey} (ID: ${group.id}), found ${valuesArray.length} total values`);
    
    const filteredValues = valuesArray.filter((value: CustomFieldValue) => value.groupId === group.id);
    console.log(`Found ${filteredValues.length} values for group key ${groupKey} (ID: ${group.id})`);
    
    return filteredValues;
  };

  // Helper to get values for a specific group ID from the local cache
  const getValuesByGroupId = (groupId: number): CustomFieldValue[] => {
    // Ensure values is an array
    const valuesArray = Array.isArray(values) ? values : [];
    console.log(`Getting values for group ID ${groupId}, found ${valuesArray.length} total values`);
    
    const filteredValues = valuesArray.filter((value: CustomFieldValue) => value.groupId === groupId);
    console.log(`Found ${filteredValues.length} values for group ID ${groupId}`);
    
    return filteredValues;
  };
  
  // Fetch values for a specific group ID directly from the API
  const fetchValuesByGroupId = async (groupId: number): Promise<CustomFieldValue[]> => {
    if (!practiceId) {
      console.error('No practice ID available for fetching values');
      return [];
    }
    
    console.log(`Directly fetching values for group ID ${groupId} from API`);
    
    try {
      const res = await apiRequest("GET", `/api/custom-fields/values/group/${groupId}`);
      const data = await res.json();
      
      console.log(`Received ${data.length} values directly from API for group ID ${groupId}`, data);
      
      if (!Array.isArray(data)) {
        console.error('API returned non-array data for values:', data);
        return [];
      }
      
      // Transform the API response if needed (sometimes the API returns with different field names)
      const transformedData = data.map(item => ({
        id: item.id,
        value: item.value || item.name || '',
        label: item.label || item.name || '',
        groupId: item.groupId || groupId,
        practiceId: item.practiceId || practiceId,
        isActive: item.isActive === undefined ? true : item.isActive,
        sortOrder: item.sortOrder || item.order || 0,
        isDefault: item.isDefault === undefined ? false : item.isDefault,
        isSystem: item.isSystem === undefined ? false : item.isSystem,
        createdAt: item.createdAt || null,
        updatedAt: item.updatedAt || null,
      }));
      
      return transformedData;
    } catch (error) {
      console.error(`Error fetching values for group ID ${groupId}:`, error);
      return [];
    }
  };

  // Helper to get dependencies for a specific group
  const getDependenciesByGroupId = (groupId: number): CustomFieldDependency[] => {
    return dependencies.filter((dep: CustomFieldDependency) => 
      dep.parentGroupId === groupId || dep.childGroupId === groupId
    );
  };

  // Helper to get dependencies where a group is a parent
  const getParentDependenciesByGroupId = (groupId: number): CustomFieldDependency[] => {
    return dependencies.filter((dep: CustomFieldDependency) => dep.parentGroupId === groupId);
  };

  // Helper to get dependencies where a group is a child
  const getChildDependenciesByGroupId = (groupId: number): CustomFieldDependency[] => {
    return dependencies.filter((dep: CustomFieldDependency) => dep.childGroupId === groupId);
  };

  // Helper to get dependencies for a specific value
  const getDependenciesByValueId = (valueId: number): CustomFieldDependency[] => {
    return dependencies.filter((dep: CustomFieldDependency) => dep.parentValueId === valueId);
  };

  // Helper to get audit logs for a specific entity
  const getAuditLogsByEntity = (entityType: string, entityId: number): CustomFieldAuditLog[] => {
    return auditLogs.filter((log: CustomFieldAuditLog) => 
      log.entityType === entityType && log.entityId === entityId
    );
  };

  // Helper to invalidate all custom field queries
  const invalidateCustomFieldQueries = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/custom-fields/categories/practice/${practiceId}`, practiceId] });
    queryClient.invalidateQueries({ queryKey: [`/api/custom-fields/groups/practice/${practiceId}`, practiceId] });
    queryClient.invalidateQueries({ queryKey: [`/api/custom-fields/values/practice/${practiceId}`, practiceId] });
    queryClient.invalidateQueries({ queryKey: [`/api/custom-fields/dependencies/practice/${practiceId}`, practiceId] });
    queryClient.invalidateQueries({ queryKey: [`/api/custom-fields/audit-logs/practice/${practiceId}`, practiceId] });
  };

  // Helper to get a single value by its ID
  const getValueById = (valueId: number): CustomFieldValue | undefined => {
    return values.find((value: CustomFieldValue) => value.id === valueId);
  };

  // Helper to get a single value by its actual value
  const getValueByValue = (groupKey: string, actualValue: string): CustomFieldValue | undefined => {
    const groupValues = getValuesByGroupKey(groupKey);
    return groupValues.find((value: CustomFieldValue) => value.value === actualValue);
  };

  // Helper to check if a specific value exists in a group
  const valueExistsInGroup = (groupKey: string, actualValue: string): boolean => {
    return !!getValueByValue(groupKey, actualValue);
  };

  // Helper to find a value's label from its value
  const getLabelByValue = (groupKey: string, value: string): string | undefined => {
    const customValue = getValueByValue(groupKey, value);
    return customValue?.label;
  };

  // Helper to log an audit event for custom field changes
  const logAuditEvent = (entityType: "category" | "group" | "value" | "dependency", 
                         entityId: number, 
                         action: "create" | "update" | "delete" | "activate" | "deactivate",
                         previousValue: any = null,
                         newValue: any = null) => {
    if (!user?.id || !practiceId) return;
    
    createAuditLogMutation.mutate({
      entityType,
      entityId,
      action,
      userId: user.id,
      practiceId,
      previousValue,
      newValue,
      ipAddress: null,
      userAgent: null
    });
  };

  return {
    categories,
    groups,
    values,
    dependencies,
    auditLogs,
    isLoading: isCategoriesLoading || isGroupsLoading || isValuesLoading || isDependenciesLoading || isAuditLogsLoading,
    error: categoriesError || groupsError || valuesError || dependenciesError || auditLogsError,
    refetchAll: () => {
      refetchCategories();
      refetchGroups();
      refetchValues();
      refetchDependencies();
      refetchAuditLogs();
    },
    invalidateCustomFieldQueries,
    getGroupByKey,
    getValuesByGroupKey,
    getValuesByGroupId,
    fetchValuesByGroupId, // Add the new direct API method
    getValueById,
    getValueByValue,
    valueExistsInGroup,
    getLabelByValue,
    
    // Dependencies-related methods
    getDependenciesByGroupId,
    getParentDependenciesByGroupId,
    getChildDependenciesByGroupId,
    getDependenciesByValueId,
    createDependency: createDependencyMutation.mutate,
    updateDependency: updateDependencyMutation.mutate,
    deleteDependency: deleteDependencyMutation.mutate,
    
    // Audit log-related methods
    getAuditLogsByEntity,
    logAuditEvent,
    
    // Mutation states
    isDependencyMutating: createDependencyMutation.isPending || 
                         updateDependencyMutation.isPending || 
                         deleteDependencyMutation.isPending
  };
}