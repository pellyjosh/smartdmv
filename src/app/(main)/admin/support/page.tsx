"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LifeBuoy, Users, Bell, Flame, Loader2, FileQuestion } from "lucide-react";
import Link from "next/link";

export default function AdminSupportPage() {
  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/admin/contact-requests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/contact-requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch contact requests");
      return res.json();
    },
    staleTime: 60_000,
  });

  const metrics = useMemo(() => {
    const list = requests || [];
    const total = list.length;
    const unread = list.filter((r: any) => !r.read).length;
    const emergency = list.reduce((acc: number, r: any) => {
      let m: any = {};
      try { m = r.metadata ? (typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata) : {}; } catch { m = {}; }
      return acc + (m.urgency === "emergency" ? 1 : 0);
    }, 0);
    const byUrgency = list.reduce((acc: Record<string, number>, r: any) => {
      let m: any = {};
      try { m = r.metadata ? (typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata) : {}; } catch { m = {}; }
      const u = m.urgency || "medium";
      acc[u] = (acc[u] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { total, unread, emergency, byUrgency };
  }, [requests]);

  return (
    <div className="mx-auto py-6 space-y-6">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-xl p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <div className="bg-primary/20 p-2 rounded-lg">
                  <LifeBuoy className="h-6 w-6 text-primary" />
                </div>
                Help & Support • Support Center
              </h1>
              <p className="text-muted-foreground max-w-2xl">View client contact requests, track urgency, and jump to actions.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline">
                <Link href="/admin/faq">Open FAQ</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">Total Requests</div>
                  {isLoading ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Skeleton className="h-7 w-12 rounded-md" />
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="text-2xl font-bold">{metrics.total}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">Unread</div>
                  {isLoading ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Skeleton className="h-7 w-12 rounded-md" />
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="text-2xl font-bold">{metrics.unread}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Flame className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">Emergency</div>
                  {isLoading ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Skeleton className="h-7 w-12 rounded-md" />
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="text-2xl font-bold">{metrics.emergency}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>Browse common questions and answers</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Visit the FAQ for guidance</div>
            <Button asChild>
              <Link href="/admin/faq">Open FAQ</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Requests</CardTitle>
            <CardDescription>Client messages and call requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-2xl font-semibold">{isLoading ? "–" : metrics.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{isLoading ? "–" : metrics.unread}</div>
                <div className="text-sm text-muted-foreground">Unread</div>
              </div>
              <Button asChild>
                <Link href="/admin/contact-requests">View All</Link>
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(["emergency", "high", "medium", "low"] as const).map((lvl) => (
                <div key={lvl} className="border rounded-md p-3 text-center">
                  <div className="text-sm capitalize">{lvl}</div>
                  <div className="text-lg font-semibold">{isLoading ? "–" : metrics.byUrgency[lvl] || 0}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Useful shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/appointments">Schedule Appointment</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/billing">Open Billing</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/offline-demo">Inspect Offline Storage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Unread</CardTitle>
          <CardDescription>Latest items requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading
              </div>
            ) : (requests || []).filter((r: any) => !r.read).slice(0, 5).length === 0 ? (
              <div className="text-sm text-muted-foreground">No unread requests</div>
            ) : (
              (requests || [])
                .filter((r: any) => !r.read)
                .slice(0, 5)
                .map((r: any) => {
                  let m: any = {};
                  try { m = r.metadata ? (typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata) : {}; } catch { m = {}; }
                  return (
                    <div key={r.id} className="flex items-center justify-between border rounded-md p-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10">
                          <FileQuestion className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{r.title || "Contact Request"}</div>
                          <div className="text-xs text-muted-foreground">
                            {m.clientName || "Client"}
                            {m.petName ? ` • ${m.petName}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{(m.urgency || "medium")}</Badge>
                        <Button asChild size="sm" variant="outline">
                          <Link href="/admin/contact-requests">Open</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}