import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { useUser } from "@/context/UserContext";
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
import { useQuery, useMutation } from "@tanstack/react-query";

export type SimpleCustomFieldOption = {
  id: number;
  value: string;
  label: string;
  isActive?: boolean;
};

interface SimpleCustomFieldSelectProps {
  name: string;
  groupKey: string;
  categoryName?: string; // Added categoryName for dynamic category selection
  label?: string;
  description?: string;
  required?: boolean;
  className?: string;
  selectClassName?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  showInactive?: boolean;
  createIfNotExists?: boolean; // For allowing creation of new category and group if not found
  value?: string; // For controlled component
  // Fallback options to show if no custom field values are found
  fallbackOptions?: Array<{ value: string; label: string }>;
}

export function SimpleCustomFieldSelect({
  name,
  groupKey,
  categoryName,
  label,
  description,
  required = false,
  className,
  selectClassName,
  placeholder = "Select an option...",
  onChange,
  showInactive = false,
  createIfNotExists = false,
  value,
  fallbackOptions,
}: SimpleCustomFieldSelectProps) {
  // For external refresh control
  const refreshRef = React.useRef<() => void>(() => {});
  
  const { user, userPracticeId } = useUser();
  const form = useFormContext();
  const practiceId = userPracticeId;

  // State for holding options
  const [options, setOptions] = React.useState<SimpleCustomFieldOption[]>([]);
  const [defaultValue, setDefaultValue] = React.useState<string | undefined>(undefined);
  // Map fallback options into internal option shape (use negative IDs to avoid clashes)
  const mappedFallbackOptions = React.useMemo<SimpleCustomFieldOption[]>(
    () => (fallbackOptions || []).map((o, idx) => ({ id: -1 - idx, value: o.value, label: o.label, isActive: true })),
    [fallbackOptions]
  );

  // First, get categories
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: [`/api/custom-fields/categories/practice/${practiceId}`],
    enabled: !!practiceId && !!categoryName,
    queryFn: async () => {
      const res = await fetch(`/api/custom-fields/categories/practice/${practiceId}`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    },
    
  });

  // Find category ID
  const categoryId = React.useMemo(() => {
    if (!categories || !categoryName) return null;
    
    const category = Array.isArray(categories) 
      ? categories.find((c: any) => c.name === categoryName)
      : null;
      
    return category?.id || null;
  }, [categories, categoryName]);

  // Next, get the groups
  const { data: groups, isLoading: isLoadingGroups } = useQuery({
    queryKey: [`/api/custom-fields/groups/practice/${practiceId}`],
    enabled: !!practiceId,
    queryFn: async () => {
      const res = await fetch(`/api/custom-fields/groups/practice/${practiceId}`);
      if (!res.ok) throw new Error('Failed to fetch groups');
      return res.json();
    },
    
  });

  // Get group ID 
  const groupId = React.useMemo(() => {
    if (!groups) return null;
    
    const group = Array.isArray(groups) 
      ? groups.find((g: any) => g.key === groupKey)
      : null;
      
    return group?.id || null;
  }, [groups, groupKey]);

  // Get values for this group ID
  const { 
    data: values, 
    isLoading: isLoadingValues,
    error,
    refetch: refetchValues
  } = useQuery({
    queryKey: [`/api/custom-fields/values/group/${groupId}`],
    enabled: !!groupId,
    staleTime: 10000, // 10 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await fetch(`/api/custom-fields/values/group/${groupId}`);
      if (!res.ok) throw new Error('Failed to fetch values');
      return res.json();
    },
    
  });
  
  // Expose the refresh method
  React.useEffect(() => {
    // @ts-ignore - This is to make it available for the global window object
    window.refreshCustomFieldSelects = window.refreshCustomFieldSelects || {};
    // @ts-ignore
    window.refreshCustomFieldSelects[`${categoryName || ''}_${groupKey}`] = () => {
      console.log(`Refreshing custom field select: ${categoryName || ''}_${groupKey}`);
      if (refetchValues) refetchValues();
    };
    
    return () => {
      // @ts-ignore
      if (window.refreshCustomFieldSelects && window.refreshCustomFieldSelects[`${categoryName || ''}_${groupKey}`]) {
        // @ts-ignore
        delete window.refreshCustomFieldSelects[`${categoryName || ''}_${groupKey}`];
      }
    };
  }, [groupKey, categoryName, refetchValues]);

  // Process values only once they're loaded
  React.useEffect(() => {
    if (!values || !Array.isArray(values)) return;

    // Map API values to our component's required format
    const mappedOptions = values.map((item: any) => ({
      id: item.id,
      value: item.value || item.name || `option_${item.id}`,
      label: item.label || item.name || `Option ${item.id}`,
      isActive: item.isActive !== undefined ? item.isActive : true,
    }));

    // Filter inactive options if needed
    const filteredOptions = showInactive 
      ? mappedOptions 
      : mappedOptions.filter(option => option.isActive);

    // Sort options by label
    const sortedOptions = filteredOptions.sort((a, b) => 
      a.label.localeCompare(b.label)
    );

    setOptions(sortedOptions);

    // Use the provided value if available, otherwise default to "virtual"
    if (value) {
      setDefaultValue(value);
    } else {
      const defaultOption = sortedOptions.find(opt => opt.value === "virtual");
      if (defaultOption) {
        setDefaultValue(defaultOption.value);
      }
    }
  }, [values, showInactive]);

  // If there are no fetched options, fall back to provided fallbackOptions
  React.useEffect(() => {
    if (options.length === 0 && mappedFallbackOptions.length > 0) {
      setOptions(mappedFallbackOptions);
      // If no current value, set a sensible default (first fallback or "virtual")
      if (!value && !defaultValue) {
        const virtual = mappedFallbackOptions.find(o => o.value === "virtual");
        setDefaultValue(virtual ? virtual.value : mappedFallbackOptions[0]?.value);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappedFallbackOptions.length]);

  // Apply default value to form if needed
  React.useEffect(() => {
    if (defaultValue && form && !form.getValues(name)) {
      form.setValue(name, defaultValue);
    }
  }, [defaultValue, form, name]);

  // Create category and group if needed using mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; practiceId: string }) => {
      const res = await fetch(`/api/custom-fields/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create category');
      return await res.json();
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      key: string; 
      description: string; 
      categoryId: number;
      practiceId: string;
    }) => {
      const res = await fetch(`/api/custom-fields/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create group');
      return await res.json();
    },
  });
  
  const createValueMutation = useMutation({
    mutationFn: async (data: { 
      value: string; 
      label: string; 
      groupId: number;
      practiceId: number;
    }) => {
      const res = await fetch(`/api/custom-fields/values`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create value');
      return await res.json();
    },
    onSuccess: (data: any) => {
      // Add the new value to the options
      setOptions(prev => [
        ...prev, 
        {
          id: data.id,
          value: data.value,
          label: data.label,
          isActive: true
        }
      ]);
    }
  });

  // Effect to create category and group if needed
  React.useEffect(() => {
    // Only attempt to create if createIfNotExists is true
    if (!createIfNotExists) return;
    
    // If the category doesn't exist and we have a categoryName
    if (!categoryId && categoryName && practiceId) {
      createCategoryMutation.mutate({
        name: categoryName,
        description: `Custom fields for ${categoryName.toLowerCase()}`,
        practiceId: practiceId,
      }, {
        onSuccess: (newCategory: any) => {
          // Now create the group
          createGroupMutation.mutate({
            name: groupKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            key: groupKey,
            description: `${groupKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} for ${categoryName}`,
            categoryId: newCategory.id,
            practiceId: practiceId,
          });
        }
      });
    }
    // If the category exists but the group doesn't
    else if (categoryId && !groupId && practiceId) {
      createGroupMutation.mutate({
        name: groupKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        key: groupKey,
        description: `${groupKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} for ${categoryName || 'custom fields'}`,
        categoryId: categoryId,
        practiceId: practiceId,
      });
    }
  }, [categoryId, groupId, categoryName, groupKey, practiceId, createIfNotExists]);

  const isLoading = isLoadingGroups || isLoadingValues || isLoadingCategories || 
                   createCategoryMutation.isPending || createGroupMutation.isPending;

  // Handle value change
  const handleValueChange = (value: string) => {
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
                {options.length === 0 ? (
                  <div className="text-center py-2 text-muted-foreground">
                    {error
                      ? "Failed to load options"
                      : "No options available"}
                  </div>
                ) : (
                  options.map((option) => (
                    <SelectItem
                      key={option.id}
                      value={option.value}
                      disabled={option.isActive === false}
                    >
                      {option.label}
                    </SelectItem>
                  ))
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