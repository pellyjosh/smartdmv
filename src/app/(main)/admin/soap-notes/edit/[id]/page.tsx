"use client";
import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SOAPNoteForm } from '@/app/(main)/admin/soap-notes/page';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function EditSOAPNotePage() {
  const params = useParams() as { id?: string };
  const id = params?.id;
  const router = useRouter();
  const { toast } = useToast();

  const { data: note, isLoading, error } = useQuery({
    queryKey: ['/api/soap-notes', id],
    queryFn: async () => {
      if (!id) throw new Error('Missing SOAP note id');
      const res = await fetch(`/api/soap-notes/${id}`);
      if (!res.ok) throw new Error('Failed to load SOAP note');
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-border" />
      </div>
    );
  }

  if (error || !note) {
    toast({ title: 'Error', description: (error as Error)?.message || 'SOAP note not found', variant: 'destructive' });
    // fallback UI
    return (
      <Card>
        <CardContent className="p-6">Failed to load SOAP note for editing.</CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="bg-white p-6 rounded-md shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-semibold">Edit SOAP Note #{note.id}</h1>
        </div>

        {/* reuse SOAPNoteForm from page.tsx by passing initialData and onSuccess handler to redirect back */}
        <SOAPNoteForm
          initialData={note}
          onSuccess={() => router.push('/admin/soap-notes')}
        />
      </div>
    </div>
  );
}
