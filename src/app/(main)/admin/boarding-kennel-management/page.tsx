'use client';
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  ArrowLeft,
  Home,
  SquarePen,
  Trash2,
  Eye
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePracticeId } from "@/hooks/use-practice-id";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Kennel } from "@/db/schemas/boardingSchema";

export default function BoardingKennelManagementPage() {
  const practiceId = usePracticeId();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Mock data for kennels
  const mockKennels: Kennel[] = [
    {
      id: "1",
      name: "Kennel A1",
      practiceId: practiceId || "practice-1",
      type: "standard",
      size: "medium",
      location: "Main Building - Room 1",
      description: "Standard kennel with outdoor access",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "2",
      name: "Kennel B2",
      practiceId: practiceId || "practice-1",
      type: "deluxe",
      size: "large",
      location: "Main Building - Room 1",
      description: "Deluxe kennel with window and extra space",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "3",
      name: "Kennel C3",
      practiceId: practiceId || "practice-1",
      type: "premium",
      size: "large",
      location: "Main Building - Room 2",
      description: "Premium kennel with webcam and play area",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "4",
      name: "Kennel D4",
      practiceId: practiceId || "practice-1",
      type: "cats_only",
      size: "small",
      location: "Cat Room",
      description: "Designed specifically for cats with climbing areas",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "5",
      name: "Kennel E5",
      practiceId: practiceId || "practice-1",
      type: "isolation",
      size: "medium",
      location: "Isolation Wing",
      description: "For pets requiring isolation",
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "6",
      name: "Kennel F6",
      practiceId: practiceId || "practice-1",
      type: "standard",
      size: "small",
      location: "Main Building - Room 3",
      description: "Compact kennel for small dogs",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Filter kennels based on search and filters
  const filteredKennels = mockKennels.filter(kennel => {
    const matchesSearch = !searchQuery || 
      kennel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kennel.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kennel.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || kennel.type === typeFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && kennel.isActive) ||
      (statusFilter === "inactive" && !kennel.isActive);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/boarding">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Boarding
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Kennel Management</h1>
          <p className="text-muted-foreground">Manage boarding kennels and facilities</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Kennel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kennel Inventory</CardTitle>
          <CardDescription>Manage all kennels and their details</CardDescription>
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search kennels..."
                className="w-full pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="deluxe">Deluxe</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="isolation">Isolation</SelectItem>
                <SelectItem value="cats_only">Cats Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredKennels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No kennels found matching your criteria
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredKennels.map((kennel) => (
                <Card key={kennel.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{kennel.name}</CardTitle>
                      <div className="flex gap-1">
                        <Badge variant={kennel.isActive ? "outline" : "secondary"}>
                          {kennel.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {kennel.type.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>{kennel.location}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground">Type:</p>
                        <p className="font-medium capitalize">{kennel.type.replace("_", " ")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Size:</p>
                        <p className="font-medium capitalize">{kennel.size}</p>
                      </div>
                    </div>
                    {kennel.description && (
                      <div>
                        <p className="text-muted-foreground text-sm">Description:</p>
                        <p className="text-sm">{kennel.description}</p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <Link href={`/admin/boarding-kennel-management/${kennel.id}`}>
                      <Button variant="secondary" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    <div className="flex gap-1">
                      <Link href={`/admin/boarding-kennel-management/${kennel.id}/edit`}>
                        <Button variant="outline" size="icon" title="Edit">
                          <SquarePen className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
