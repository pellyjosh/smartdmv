import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCustomFields, CustomFieldDependency } from "@/hooks/use-custom-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

export type CustomFieldOption = {
  id: number;
  value: string;
  label: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
};

interface CustomFieldSelectProps {
  // The field name in the form that will store the selected value
  name: string;
  // The key of the custom field group to use for options
  groupKey: string;
  // Optional label to display above the select
  label?: string;
  // Optional description text
  description?: string;
  // Whether the field is required
  required?: boolean;
  // CSS class for the container
  className?: string;
  // CSS class for the select component
  selectClassName?: string;
  // Optional placeholder text
  placeholder?: string;
  // Optional callback when value changes
  onChange?: (value: string) => void;
  // Whether to show inactive options
  showInactive?: boolean;
  // Sort order for options (default is by sortOrder field)
  sortBy?: "label" | "value" | "sortOrder";
  // Parent field group key (if this field depends on another)
  dependsOnGroupKey?: string;
  // Data to be used for audit logging on change
  auditData?: {
    entityType: "category" | "group" | "value" | "dependency";
    entityId: number;
  };
}

export function CustomFieldSelect({
  name,
  groupKey,
  label,
  description,
  required = false,
  className,
  selectClassName,
  placeholder = "Select an option...",
  onChange,
  showInactive = false,
  sortBy = "sortOrder",
  dependsOnGroupKey,
  auditData,
}: CustomFieldSelectProps) {
  const { user } = useAuth();
  const form = useFormContext();
  const practiceId = user?.practiceId;
  
  // Use our enhanced custom fields hook
  const {
    getGroupByKey,
    getValuesByGroupId,
    getDependenciesByGroupId,
    logAuditEvent
  } = useCustomFields();

  // Step 1: Find the group IDs
  const currentGroup = getGroupByKey(groupKey);
  const parentGroup = dependsOnGroupKey ? getGroupByKey(dependsOnGroupKey) : null;

  // Get the parent field's current value from the form
  const parentFieldName = dependsOnGroupKey ? 
    form.getValues(dependsOnGroupKey.replace(/\./g, '_')) : null;
  
  // Step 2: Check for dependencies
  const dependencies = currentGroup ? 
    getDependenciesByGroupId(currentGroup.id) : [];
  
  // Look for dependencies where this group is a child
  const childDependencies = dependencies.filter(
    (dep: CustomFieldDependency) => dep.childGroupId === currentGroup?.id
  );

  // Step 1: Find the group ID from the group key
  const { data: groups, isLoading: isLoadingGroups } = useQuery({
    queryKey: [`/api/custom-fields/groups/practice/${practiceId}`, practiceId],
    enabled: !!practiceId,
  });

  const groupId = React.useMemo(() => {
    console.log(`Searching for group with key: ${groupKey} among groups:`, groups);
    if (!groups) return null;
    const groupsArray = Array.isArray(groups) ? groups : [];
    const group = groupsArray.find((g: any) => g.key === groupKey);
    console.log(`Found group:`, group);
    return group?.id || null;
  }, [groups, groupKey]);

  // Step 2: Fetch values for the specific group
  // Query for initial values from the cache
  const {
    data: values,
    isLoading: isLoadingValues,
    error,
  } = useQuery({
    queryKey: [`/api/custom-fields/values/group/${groupId}`, groupId],
    enabled: !!groupId,
  });
  
  // State to store the fetched values from direct API call
  const [directValues, setDirectValues] = React.useState<any[]>([]);
  const [isDirectLoading, setIsDirectLoading] = React.useState(false);
  const [directError, setDirectError] = React.useState<Error | null>(null);
  
  // Get the fetchValuesByGroupId function from the hook outside of the useEffect
  const { fetchValuesByGroupId } = useCustomFields();
  
  // Static flag to track if a fetch attempt has been made
  const fetchAttemptedRef = React.useRef(false);
  
  // Fetch values directly using our new method - with proper dependency caching
  React.useEffect(() => {
    // Only run this effect if we have a groupId and a function to fetch values
    if (!groupId || !fetchValuesByGroupId) return;
    
    // Skip if we already have values or if we've already attempted a fetch
    if (directValues.length > 0 || fetchAttemptedRef.current) return;
    
    // Mark that we've attempted a fetch to prevent infinite loops
    fetchAttemptedRef.current = true;
    
    // Track if the component is still mounted
    let isMounted = true;
    
    const fetchDirectValues = async () => {
      setIsDirectLoading(true);
      
      try {
        console.log(`Attempting to fetch values directly for group ID ${groupId}`);
        
        const result = await fetchValuesByGroupId(groupId);
        console.log(`Directly fetched values for group ID ${groupId}:`, result);
        
        if (isMounted) {
          setDirectValues(result);
          setDirectError(null);
        }
      } catch (err) {
        console.error(`Error directly fetching values for group ID ${groupId}:`, err);
        if (isMounted) {
          setDirectError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setIsDirectLoading(false);
        }
      }
    };
    
    fetchDirectValues();
    
    // Clean up function
    return () => {
      isMounted = false;
    };
  }, [groupId, fetchValuesByGroupId]);
  
  // Log the values for debugging
  React.useEffect(() => {
    if (values) {
      console.log(`Received values from standard query for group ID ${groupId}:`, values);
    }
    
    if (directValues.length > 0) {
      console.log(`Using directly fetched values for group ID ${groupId}:`, directValues);
    }
  }, [values, directValues, groupId]);

  // Step 3: If we have a parent field selected, check dependencies
  const shouldShowField = React.useMemo(() => {
    if (!dependsOnGroupKey || !parentGroup || !currentGroup || childDependencies.length === 0) {
      return true; // No dependencies, so always show
    }

    // Find the parent value object based on the selected value
    const parentValues = getValuesByGroupId(parentGroup.id);
    const selectedParentValue = parentValues.find(v => v.value === parentFieldName);
    
    if (!selectedParentValue) {
      return false; // Parent value not found or not selected
    }

    // For each dependency, check if it applies
    for (const dep of childDependencies) {
      // If there's a specific value dependency
      if (dep.parentValueId) {
        if (dep.parentValueId === selectedParentValue.id) {
          // This dependency applies to the selected parent value
          return dep.filterType === "show_when_selected";
        }
      } else {
        // This is a general dependency on the parent group
        return dep.filterType === "show_when_selected";
      }
    }

    return false; // No applicable dependencies found
  }, [dependsOnGroupKey, parentGroup, currentGroup, childDependencies, parentFieldName, getValuesByGroupId]);

  // Filter and sort the options
  const options = React.useMemo(() => {
    console.log("CustomFieldSelect - values from query:", values);
    console.log("CustomFieldSelect - directValues from custom hook:", directValues);
    console.log("CustomFieldSelect - showInactive:", showInactive);
    console.log("CustomFieldSelect - sortBy:", sortBy);
    
    // Choose the best source of values - prefer directValues if available
    let sourceValues: any[] = [];
    
    if (directValues && directValues.length > 0) {
      console.log("CustomFieldSelect - Using directValues (from direct API call)");
      sourceValues = directValues;
    } else if (values) {
      console.log("CustomFieldSelect - Using values (from standard query)");
      // Ensure values is treated as an array
      sourceValues = Array.isArray(values) ? values : [];
    }
    
    console.log("CustomFieldSelect - sourceValues.length:", sourceValues.length);
    
    if (sourceValues.length === 0) {
      console.log("CustomFieldSelect - No values available from any source");
      return [];
    }
    
    // Map the API response to our expected format
    const mappedValues = sourceValues.map((value: any) => {
      const result = {
        id: value.id,
        value: value.value || `option_${value.id}`, // Ensure we have a value
        label: value.name || value.label || `Option ${value.id}`, // API uses 'name', fall back to 'label' or generate one
        isDefault: value.isDefault || false, // Default false if not provided
        isActive: value.isActive !== undefined ? value.isActive : true, // Default true if not provided
        sortOrder: value.order || value.sortOrder || 0 // API uses 'order', fall back to 'sortOrder' or 0
      };
      console.log(`CustomFieldSelect - Mapped value ${value.id}:`, result);
      return result;
    });

    console.log("CustomFieldSelect - All mapped values:", mappedValues);

    const filteredValues = mappedValues.filter((option: CustomFieldOption) => {
      const keep = showInactive ? true : option.isActive;
      console.log(`CustomFieldSelect - Filtering option ${option.id} (${option.label}): keep=${keep}`);
      return keep;
    });

    // Sort the options based on the specified sort method
    return filteredValues.sort((a: CustomFieldOption, b: CustomFieldOption) => {
      if (sortBy === "label") {
        return a.label.localeCompare(b.label);
      } else if (sortBy === "value") {
        return a.value.localeCompare(b.value);
      } else {
        // Default sort by sortOrder
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      }
    });
  }, [values, directValues, showInactive, sortBy]);

  // Find the default value
  const defaultValue = React.useMemo(() => {
    if (!options.length) return undefined;
    const defaultOption = options.find((option: CustomFieldOption) => option.isDefault);
    return defaultOption?.value;
  }, [options]);

  const isLoading = isLoadingGroups || isLoadingValues || isDirectLoading;

  // We need to update the form if a default value is found and no value is set
  React.useEffect(() => {
    if (defaultValue && form && !form.getValues(name) && shouldShowField) {
      form.setValue(name, defaultValue);
    }
  }, [defaultValue, form, name, shouldShowField]);

  // If there's a dependency and it doesn't pass, don't render the field
  if (dependsOnGroupKey && !shouldShowField) {
    return null;
  }

  // Handle value change and audit logging
  const handleValueChange = (value: string) => {
    if (auditData && user?.id && practiceId) {
      // Get the old value for audit logging
      const oldValue = form.getValues(name);
      const newValue = value;
      
      // Log the change
      logAuditEvent(
        auditData.entityType,
        auditData.entityId,
        "update",
        { value: oldValue },
        { value: newValue }
      );
    }
    
    // Call the external onChange handler if provided
    if (onChange) onChange(value);
  };

  return (
    <FormField
      name={name}
      rules={{ required: required ? "This field is required" : false }}
      render={({ field }) => (
        <FormItem className={cn("space-y-2", className)}>
          {label && (
            <FormLabel>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
          )}
          <FormControl>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                handleValueChange(value);
              }}
              defaultValue={field.value}
              value={field.value}
              disabled={isLoading}
            >
              <SelectTrigger
                className={cn(
                  "w-full",
                  error && "border-destructive",
                  selectClassName
                )}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  <SelectValue placeholder={placeholder} />
                )}
              </SelectTrigger>
              <SelectContent>
                {/* Debug information logged outside of the JSX */}
                {React.useMemo(() => {
                  console.log("SelectContent rendering, options:", options);
                  return null;
                }, [options])}
                {options.length === 0 ? (
                  <div className="text-center py-2 text-muted-foreground">
                    {error
                      ? "Failed to load options"
                      : "No options available"}
                  </div>
                ) : (
                  <>
                    {/* Debug information logged outside of the JSX */}
                    {React.useMemo(() => {
                      console.log("Rendering select items:", options.length, "options");
                      return null;
                    }, [options.length])}
                    {/* Debug information for all options */}
                    {React.useMemo(() => {
                      console.log("All options to be rendered:", options);
                      return null;
                    }, [options])}
                    
                    {options.map((option: CustomFieldOption) => (
                      <SelectItem
                        key={option.id}
                        value={option.value}
                        disabled={!option.isActive}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}