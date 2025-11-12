/**
 * Storage Manager Component
 * File manager-style interface for viewing and managing all offline records
 */

"use client";

import { useState, useEffect } from "react";
import { indexedDBManager } from "@/lib/offline/db";
import { STORES } from "@/lib/offline/db/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  RefreshCw,
  Search,
  Database,
  FileJson,
  Eye,
  Download,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface StorageRecord {
  store: string;
  id: number | string;
  data: any;
  size: number; // estimated size in bytes
}

export function StorageManager() {
  const { toast } = useToast();
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [records, setRecords] = useState<StorageRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<StorageRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<StorageRecord | null>(
    null
  );
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [recordToView, setRecordToView] = useState<StorageRecord | null>(null);

  const stores = [
    { value: "all", label: "All Entities" },
    { value: STORES.APPOINTMENTS, label: "appointments" },
    { value: STORES.PETS, label: "pets" },
    { value: STORES.CLIENTS, label: "Clients" },
    { value: STORES.SOAP_NOTES, label: "SOAP Notes" },
  ];

  useEffect(() => {
    loadRecords();
  }, [selectedStore]);

  useEffect(() => {
    filterRecords();
  }, [searchQuery, records]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const { tenantId } = indexedDBManager.getCurrentTenant();
      if (!tenantId) {
        console.error("[StorageManager] No tenant context available");
        toast({
          title: "Error",
          description: "No tenant context available",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log("[StorageManager] Loading with tenantId:", tenantId);
      const db = await indexedDBManager.initialize(tenantId);

      console.log("[StorageManager] Database info:", {
        name: db.name,
        version: db.version,
        stores: Array.from(db.objectStoreNames),
      });

      const allRecords: StorageRecord[] = [];
      const availableStores = Array.from(db.objectStoreNames);

      // Entity store base names
      const entityStoreNames = [
        STORES.APPOINTMENTS, // 'appointments'
        STORES.PETS, // 'pets'
        STORES.CLIENTS, // 'clients'
        STORES.SOAP_NOTES, // 'soapNotes'
      ];

      console.log(
        "[StorageManager] Looking for entity stores:",
        entityStoreNames
      );
      console.log(
        "[StorageManager] 🔍 Full list of stores:",
        availableStores.join(", ")
      );

      // Find practice-prefixed stores (e.g., practice_1_appointments, practice_2_pets, etc.)
      const entityStores = availableStores.filter((storeName) => {
        // Check if store name ends with one of our entity store names
        return entityStoreNames.some(
          (entityName) =>
            storeName.endsWith(`_${entityName}`) || storeName === entityName
        );
      });

      console.log("[StorageManager] 📋 Found entity stores:", entityStores);

      const storesToLoad =
        selectedStore === "all"
          ? entityStores
          : entityStores.filter(
              (name) =>
                name.endsWith(`_${selectedStore}`) || name === selectedStore
            );

      console.log("[StorageManager] 🎯 Stores to load:", storesToLoad);

      for (const storeName of storesToLoad) {
        console.log(`[StorageManager] Loading from store: "${storeName}"`);

        try {
          const storeRecords = await new Promise<any[]>((resolve, reject) => {
            const tx = db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
              console.log(
                `[StorageManager] ✅ Store "${storeName}": ${
                  request.result?.length || 0
                } records`
              );
              resolve(request.result || []);
            };
            request.onerror = () => {
              console.error(
                `[StorageManager] ❌ Error reading "${storeName}":`,
                request.error
              );
              reject(request.error);
            };
          });

          storeRecords.forEach((data) => {
            const jsonString = JSON.stringify(data);
            allRecords.push({
              store: storeName,
              id: data.id || data.key || "unknown",
              data,
              size: new Blob([jsonString]).size,
            });
          });
        } catch (error) {
          console.error(
            `[StorageManager] Error loading from store "${storeName}":`,
            error
          );
        }
      }

      console.log(
        `[StorageManager] 📊 Loaded ${allRecords.length} total records from ${storesToLoad.length} stores`
      );
      setRecords(allRecords);
    } catch (error) {
      console.error("[StorageManager] Failed to load records:", error);
      toast({
        title: "Error",
        description: "Failed to load storage records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    if (!searchQuery) {
      setFilteredRecords(records);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = records.filter((record) => {
      const searchableText = JSON.stringify(record.data).toLowerCase();
      return (
        searchableText.includes(query) ||
        record.store.toLowerCase().includes(query) ||
        String(record.id).toLowerCase().includes(query)
      );
    });

    setFilteredRecords(filtered);
  };

  const handleDelete = async (record: StorageRecord) => {
    try {
      const { tenantId } = indexedDBManager.getCurrentTenant();
      if (!tenantId) return;

      const db = await indexedDBManager.initialize(tenantId);

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(record.store, "readwrite");
        const store = tx.objectStore(record.store);
        const request = store.delete(record.id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      toast({
        title: "Record Deleted",
        description: `Deleted record ${record.id} from ${record.store}`,
      });

      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      loadRecords();
    } catch (error) {
      console.error("Failed to delete record:", error);
      toast({
        title: "Error",
        description: "Failed to delete record",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAll = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL records? This cannot be undone!"
      )
    ) {
      return;
    }

    try {
      const { tenantId } = indexedDBManager.getCurrentTenant();
      if (!tenantId) return;

      const db = await indexedDBManager.initialize(tenantId);
      const availableStores = Array.from(db.objectStoreNames);

      // Entity store base names
      const entityStoreNames = [
        STORES.APPOINTMENTS,
        STORES.PETS,
        STORES.CLIENTS,
        STORES.SOAP_NOTES,
      ];

      // Find practice-prefixed stores
      const entityStores = availableStores.filter((storeName) => {
        return entityStoreNames.some(
          (entityName) =>
            storeName.endsWith(`_${entityName}`) || storeName === entityName
        );
      });

      const storesToClear =
        selectedStore === "all"
          ? entityStores
          : entityStores.filter(
              (name) =>
                name.endsWith(`_${selectedStore}`) || name === selectedStore
            );

      for (const storeName of storesToClear) {
        if (!Array.from(db.objectStoreNames).includes(storeName)) continue;

        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName, "readwrite");
          const store = tx.objectStore(storeName);
          const request = store.clear();

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      toast({
        title: "All Records Deleted",
        description: `Cleared ${storesToClear.length} store(s)`,
      });

      loadRecords();
    } catch (error) {
      console.error("Failed to clear records:", error);
      toast({
        title: "Error",
        description: "Failed to clear records",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    // Convert records to CSV format
    if (filteredRecords.length === 0) {
      toast({
        title: "No Data",
        description: "No records to export",
        variant: "destructive",
      });
      return;
    }

    // Collect all unique keys from all records to create comprehensive headers
    const allKeys = new Set<string>();
    filteredRecords.forEach((record) => {
      Object.keys(record.data).forEach((key) => allKeys.add(key));
    });

    // CSV Headers: Store, ID, then all data fields
    const dataHeaders = Array.from(allKeys).sort();
    const headers = ["Store", "Record ID", ...dataHeaders];

    // Helper function to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return "";

      // Convert to string
      let str =
        typeof value === "object" ? JSON.stringify(value) : String(value);

      // Escape double quotes and wrap in quotes if contains comma, newline, or quote
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }

      return str;
    };

    // CSV Rows
    const rows = filteredRecords.map((record) => {
      const rowData = [
        escapeCSV(record.store),
        escapeCSV(record.id),
        ...dataHeaders.map((key) => escapeCSV(record.data[key])),
      ];
      return rowData.join(",");
    });

    // Combine headers and rows
    const csvContent = [headers.join(","), ...rows].join("\n");

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `offline-storage-${selectedStore}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredRecords.length} records with ${dataHeaders.length} columns`,
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getEntityTypeBadge = (record: StorageRecord) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      [STORES.APPOINTMENTS]: "default",
      [STORES.PETS]: "secondary",
      [STORES.CLIENTS]: "outline",
      [STORES.SOAP_NOTES]: "secondary",
    };
    return (
      <Badge variant={variants[record.store] || "default"}>
        {record.store}
      </Badge>
    );
  };

  const totalSize = filteredRecords.reduce((sum, r) => sum + r.size, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Storage Manager
            </CardTitle>
            <CardDescription>
              View, search, and manage offline entity records (Appointments,
              Pets, Clients, SOAP Notes)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadRecords}
              disabled={loading}
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredRecords.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAll}
              disabled={filteredRecords.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.value} value={store.value}>
                    {store.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {filteredRecords.length} record
              {filteredRecords.length !== 1 ? "s" : ""}
            </span>
            <span>•</span>
            <span>{formatSize(totalSize)} total</span>
          </div>

          {/* Records Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileJson className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No records found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record, index) => (
                    <TableRow key={`${record.store}-${record.id}-${index}`}>
                      <TableCell className="font-mono text-sm">
                        {String(record.id).substring(0, 20)}
                        {String(record.id).length > 20 && "..."}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {record.store}
                        </code>
                      </TableCell>
                      <TableCell>{getEntityTypeBadge(record)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatSize(record.size)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRecordToView(record);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRecordToDelete(record);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record from{" "}
              <code className="bg-muted px-1 py-0.5 rounded">
                {recordToDelete?.store}
              </code>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => recordToDelete && handleDelete(recordToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Record Dialog */}
      <AlertDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Record Details</AlertDialogTitle>
            <AlertDialogDescription>
              Store:{" "}
              <code className="bg-muted px-1 py-0.5 rounded">
                {recordToView?.store}
              </code>{" "}
              • ID:{" "}
              <code className="bg-muted px-1 py-0.5 rounded">
                {recordToView?.id}
              </code>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollArea className="max-h-[500px]">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(recordToView?.data, null, 2)}
            </pre>
          </ScrollArea>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
