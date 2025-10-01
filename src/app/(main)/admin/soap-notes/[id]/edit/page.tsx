"use client";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Lock, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  subjective: z.string().min(1, "Required"),
  objective: z.string().min(1, "Required"),
  assessment: z.string().min(1, "Required"),
  plan: z.string().min(1, "Required"),
});

export default function EditSoapNotePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const {
    data: note,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["soap-note", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/soap-notes/${id}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Failed to load SOAP note");
      }
      return res.json();
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { subjective: "", objective: "", assessment: "", plan: "" },
    values: note
      ? {
          subjective: note.subjective || "",
          objective: note.objective || "",
          assessment: note.assessment || "",
          plan: note.plan || "",
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await apiRequest("PATCH", `/api/soap-notes/${id}`, values);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Failed to update SOAP note");
      }
      return res.json();
    },
    onSuccess: (updated) => {
      toast({
        title: "SOAP Note Updated",
        description: "Changes have been saved.",
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["soapNotes"] });
      queryClient.invalidateQueries({
        queryKey: ["soapNotes", "pet", updated.petId],
      });
      queryClient.invalidateQueries({ queryKey: ["soap-note", id] });
      router.push(`/admin/soap-notes/pet/${updated.petId}`);
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message || "Unable to save changes",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!note) return;
    if (note.locked) {
      toast({
        title: "Locked",
        description: "This SOAP note is locked and cannot be edited.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="container mx-auto py-10 max-w-3xl">
        <Alert variant="destructive">
          <AlertDescription>
            {(error as Error)?.message || "SOAP note not found."}
          </AlertDescription>
        </Alert>
        <div className="mt-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Edit SOAP Note</h1>
          {note.locked && (
            <span className="inline-flex items-center text-xs rounded-md bg-amber-100 text-amber-700 px-2 py-1">
              <Lock className="h-3 w-3 mr-1" /> Locked
            </span>
          )}
        </div>
        <div>
          {!note.locked && (
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}{" "}
              Save Changes
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SOAP Sections</CardTitle>
          <CardDescription>
            Update the clinical note details below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="subjective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subjective</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={note.locked || updateMutation.isPending}
                        rows={5}
                        placeholder="Subjective information"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="objective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objective</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={note.locked || updateMutation.isPending}
                        rows={5}
                        placeholder="Objective findings"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assessment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assessment</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={note.locked || updateMutation.isPending}
                        rows={5}
                        placeholder="Clinical assessment"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={note.locked || updateMutation.isPending}
                        rows={5}
                        placeholder="Treatment plan"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!note.locked && (
                <div className="flex justify-end">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}{" "}
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
