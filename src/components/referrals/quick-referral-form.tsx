import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/context/UserContext";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { InsertReferral, VetSpecialty, ReferralPriority } from "@/db/schema";
import { Loader2, Send } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Simplified referral schema for quick referrals
const quickReferralSchema = z.object({
  petId: z.string(),
  referringPracticeId: z.string(),
  referringVetId: z.string(),
  referralReason: z.string().min(3, "Please provide a reason for the referral"),
  referralNotes: z.string().optional(),
  specialty: z.enum(Object.values(VetSpecialty) as [string, ...string[]]),
  priority: z.enum(Object.values(ReferralPriority) as [string, ...string[]])
});

type QuickReferralForm = z.infer<typeof quickReferralSchema>;

interface QuickReferralFormProps {
  petId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (referral: any) => void;
}

export function QuickReferralForm({
  petId,
  open,
  onOpenChange,
  onSuccess
}: QuickReferralFormProps) {
  const { toast } = useToast();
  const { user, userPracticeId } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<QuickReferralForm>({
    resolver: zodResolver(quickReferralSchema),
    defaultValues: {
      petId,
      referringPracticeId: userPracticeId || '0',
      referringVetId: user?.id || '0',
      referralReason: "",
      specialty: VetSpecialty.OTHER,
      priority: ReferralPriority.ROUTINE,
      referralNotes: ""
    }
  });

  const createReferralMutation = useMutation({
    mutationFn: async (data: QuickReferralForm) => {
      const res = await apiRequest("POST", "/api/referrals", data);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create referral");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Referral Created",
        description: "The referral has been successfully created.",
      });
      form.reset();
      onOpenChange(false);
      if (onSuccess) onSuccess(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Referral",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: QuickReferralForm) => {
    setIsLoading(true);
    createReferralMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Quick Referral</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specialty</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select specialty" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(VetSpecialty).map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty.charAt(0).toUpperCase() + specialty.slice(1).replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(ReferralPriority).map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="referralReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Referral</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Why are you referring this patient?"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="referralNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional information for the specialist"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || createReferralMutation.isPending}
              >
                {(isLoading || createReferralMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Referral
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}