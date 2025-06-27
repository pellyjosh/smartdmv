import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useCustomFields } from '@/hooks/use-custom-fields';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from "@/hooks/use-auth";

export function DebugAppointmentTypes() {
  const { user } = useAuth();
  const form = useFormContext();
  const practiceId = user?.practiceId || 1;
  
  // Clean approach - use the custom field hook
  const { 
    getGroupByKey, 
    getValuesByGroupId,
    isLoading,
    error
  } = useCustomFields();

  // Direct API approach for comparison
  const { data: groupsData } = useQuery({
    queryKey: ["/api/custom-fields/groups/practice", practiceId],
    enabled: !!practiceId,
  });

  const appointmentTypesGroup = React.useMemo(() => {
    if (!groupsData) return null;
    return groupsData.find((g: any) => g.key === 'appointment_types');
  }, [groupsData]);

  const { data: valuesData } = useQuery({
    queryKey: ["/api/custom-fields/values/group", appointmentTypesGroup?.id],
    enabled: !!appointmentTypesGroup?.id,
  });

  const handleDebugClick = () => {
    console.log("Debug Custom Fields Button:");
    
    // Show current form values
    console.log("Form values:", form.getValues());
    
    console.log("useCustomFields hook is available");
    
    // Get the appointment types group
    const appointmentTypesGroup = getGroupByKey('appointment_types');
    console.log("appointment_types group:", appointmentTypesGroup);
    
    if (appointmentTypesGroup) {
      // Get the values for this group
      const values = getValuesByGroupId(appointmentTypesGroup.id);
      console.log("appointment_types values:", values);
    }
    
    // Also log the direct API results
    console.log("Custom Field Groups (fetch):", groupsData);
    console.log("Found appointment_types group (fetch):", appointmentTypesGroup);
    console.log("Appointment Type Values (fetch):", valuesData);
  };
  
  // Auto-run on component mount
  useEffect(() => {
    setTimeout(() => {
      handleDebugClick();
    }, 1000);
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="mb-2">
      <Button variant="outline" size="sm" onClick={handleDebugClick}>
        Debug Custom Fields
      </Button>
    </div>
  );
}