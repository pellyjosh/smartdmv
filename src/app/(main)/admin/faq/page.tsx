"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, BadgeHelp, CalendarDays, CreditCard, Cloud } from "lucide-react";
import Link from "next/link";

export default function AdminFaqPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [searchTerm, setSearchTerm] = useState("");

  const data = useMemo(() => ({
    general: [
      { q: "How do I get started in the admin dashboard?", a: "Use the sidebar to access modules. Most pages use tabs and cards for organization. Your role determines available sections." },
      { q: "Which roles can access Help & Support?", a: "All staff roles listed in the sidebar can access FAQ and Support Center." },
      { q: "How can I find information quickly?", a: "Use page-level filters and search inputs provided on list views like Contact Requests and Appointments." },
    ],
    appointments: [
      { q: "How do I create or manage appointments?", a: "Navigate to Appointments from the sidebar. Use calendar and list views to schedule, edit, and manage appointments." },
      { q: "Where do appointment requests appear?", a: "Client requests appear under Appointment Requests and Contact Requests, depending on the method used." },
    ],
    billing: [
      { q: "How do I create an invoice?", a: "Open Billing, choose Invoice, and use the New Invoice page to add items and submit." },
      { q: "How are refunds processed?", a: "Use the Refunds page to initiate, track, and finalize refunds according to practice policies." },
    ],
    offline: [
      { q: "How does offline mode work?", a: "Use Offline Demo to inspect storage and sync queues. Operations are queued and synced when connectivity returns." },
      { q: "What if I have nothing to sync?", a: "The sync engine can check the server via pull routes and update local data when out of date." },
    ],
  }), []);

  const filtered = useMemo(() => {
    const list = (data as any)[activeTab] || [];
    if (!searchTerm) return list;
    const s = searchTerm.toLowerCase();
    return list.filter((i: any) => i.q.toLowerCase().includes(s) || i.a.toLowerCase().includes(s));
  }, [data, activeTab, searchTerm]);

  return (
    <div className="mx-auto py-6 space-y-6">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-xl p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <div className="bg-primary/20 p-2 rounded-lg">
                  <BadgeHelp className="h-6 w-6 text-primary" />
                </div>
                Help & Support • FAQ
              </h1>
              <p className="text-muted-foreground max-w-2xl">Search common questions and explore categorized topics. For client requests, use the Support Center.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/support">Open Support Center</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">Appointments</div>
                  <div className="text-xs text-muted-foreground">Scheduling and requests</div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">Billing</div>
                  <div className="text-xs text-muted-foreground">Invoices and refunds</div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Cloud className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">Offline & Sync</div>
                  <div className="text-xs text-muted-foreground">Storage and queueing</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Browse Topics</CardTitle>
              <CardDescription>Use categories and search to find answers</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search FAQs" className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="bg-muted/40 rounded-lg border p-1">
              <TabsList className="grid grid-cols-4 gap-1 p-1 h-auto">
                <TabsTrigger value="general" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Badge className="font-normal">General</Badge>
                </TabsTrigger>
                <TabsTrigger value="appointments" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <CalendarDays className="w-4 h-4" />
                  <span className="hidden sm:inline">Appointments</span>
                </TabsTrigger>
                <TabsTrigger value="billing" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <CreditCard className="w-4 h-4" />
                  <span className="hidden sm:inline">Billing</span>
                </TabsTrigger>
                <TabsTrigger value="offline" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Cloud className="w-4 h-4" />
                  <span className="hidden sm:inline">Offline</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="space-y-3 pt-2">
              <Accordion type="single" collapsible className="w-full">
                {filtered.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No results match your search</div>
                ) : (
                  filtered.map((item: any, idx: number) => (
                    <AccordionItem key={idx} value={`item-${idx}`}>
                      <AccordionTrigger>{item.q}</AccordionTrigger>
                      <AccordionContent>{item.a}</AccordionContent>
                    </AccordionItem>
                  ))
                )}
              </Accordion>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
          <CardDescription>Contact requests and support tools</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Open the Support Center to view and respond to client requests</div>
          <Button asChild>
            <Link href="/admin/support">Open Support Center</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}