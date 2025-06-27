import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { Check, ListPlus, Loader2 } from "lucide-react";
import { HealthPlan } from "@/db/schema";
import { cn } from "@/lib/utils";

interface HealthPlanSelectorProps {
  onSelect: (plan: HealthPlan) => void;
}

export function HealthPlanSelector({ onSelect }: HealthPlanSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<HealthPlan | null>(null);

  const { data: healthPlans, isLoading } = useQuery<HealthPlan[]>({
    queryKey: ["/api/health-plans"],
  });

  const handleSelect = (plan: HealthPlan) => {
    setSelectedPlan(plan);
    onSelect(plan);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1 border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"
        >
          <ListPlus className="h-4 w-4" />
          Add Health Plan
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[300px]" align="end">
        <Command>
          <CommandInput placeholder="Search health plans..." />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
              </div>
            ) : healthPlans && healthPlans.length > 0 ? (
              <CommandGroup heading="Available Health Plans">
                {healthPlans.map((plan) => (
                  <CommandItem
                    key={plan.id}
                    value={plan.name}
                    onSelect={() => handleSelect(plan)}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        selectedPlan?.id === plan.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{plan.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {plan.notes
                          ? plan.notes.length > 40
                            ? plan.notes.substring(0, 40) + "..."
                            : plan.notes
                          : "No description"}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <CommandEmpty>No health plans found.</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}