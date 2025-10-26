import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Inventory } from "@/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, AlertCircle, PackageOpen } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";

interface StockAlertsProps {
  onRestock?: (itemId: number) => void;
}

export function StockAlerts({ onRestock }: StockAlertsProps) {
  const [expanded, setExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch low stock items
  const {
    data: lowStockItems,
    isLoading,
    isError,
    refetch,
  } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory/reports/low-stock"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/reports/low-stock", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch low stock items");
      return res.json();
    },
  });

  // Categorize low stock items by severity
  const { criticalItems, lowItems, expiredItems, expiringItems } =
    lowStockItems?.reduce(
      (acc, item) => {
        // Check if item is expired
        if (item.expiryDate && new Date(item.expiryDate) < new Date()) {
          acc.expiredItems.push(item);
          return acc;
        }

        // Check if item is expiring within 30 days
        if (item.expiryDate) {
          const expiryDate = new Date(item.expiryDate);
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

          if (expiryDate <= thirtyDaysFromNow) {
            acc.expiringItems.push(item);
            return acc;
          }
        }

        // Check critical stock (at or below 50% of min quantity)
        if (item.minQuantity && item.quantity <= item.minQuantity * 0.5) {
          acc.criticalItems.push(item);
          return acc;
        }

        // Regular low stock
        acc.lowItems.push(item);
        return acc;
      },
      {
        criticalItems: [] as Inventory[],
        lowItems: [] as Inventory[],
        expiredItems: [] as Inventory[],
        expiringItems: [] as Inventory[],
      }
    ) || {
      criticalItems: [],
      lowItems: [],
      expiredItems: [],
      expiringItems: [],
    };

  // Total number of alerts
  const totalAlerts =
    (criticalItems?.length || 0) +
    (lowItems?.length || 0) +
    (expiredItems?.length || 0) +
    (expiringItems?.length || 0);

  // Show a compact alert if not expanded
  if (!expanded) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
              Inventory Alerts
              {totalAlerts > 0 && (
                <Badge className="ml-2 bg-amber-500">{totalAlerts}</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>
              View Details
            </Button>
          </div>
          <CardDescription>
            {totalAlerts > 0
              ? `${totalAlerts} items require attention`
              : "No stock alerts at this time"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Expanded view with detailed alerts
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
            Inventory Alerts
            {totalAlerts > 0 && (
              <Badge className="ml-2 bg-amber-500">{totalAlerts}</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
            Collapse
          </Button>
        </div>
        <CardDescription>
          Items that require attention or need to be restocked
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : isError ? (
          <div className="text-center py-6 text-destructive">
            Error loading alerts. Please try again.
          </div>
        ) : totalAlerts === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No stock alerts at this time.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Critical stock alerts */}
            {criticalItems.length > 0 && (
              <div>
                <h3 className="font-medium text-red-600 flex items-center mb-2">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Critical Stock Levels ({criticalItems.length})
                </h3>
                <div className="space-y-2">
                  {criticalItems.map((item) => (
                    <StockAlertItem
                      key={item.id}
                      item={item}
                      severity="critical"
                      onRestock={onRestock}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Expired items */}
            {expiredItems.length > 0 && (
              <div>
                <h3 className="font-medium text-red-600 flex items-center mb-2">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Expired Items ({expiredItems.length})
                </h3>
                <div className="space-y-2">
                  {expiredItems.map((item) => (
                    <StockAlertItem
                      key={item.id}
                      item={item}
                      severity="expired"
                      onRestock={onRestock}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Expiring soon */}
            {expiringItems.length > 0 && (
              <div>
                <h3 className="font-medium text-amber-600 flex items-center mb-2">
                  <Clock className="h-4 w-4 mr-1" />
                  Expiring Soon ({expiringItems.length})
                </h3>
                <div className="space-y-2">
                  {expiringItems.map((item) => (
                    <StockAlertItem
                      key={item.id}
                      item={item}
                      severity="expiring"
                      onRestock={onRestock}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Low stock alerts */}
            {lowItems.length > 0 && (
              <div>
                <h3 className="font-medium text-amber-600 flex items-center mb-2">
                  <PackageOpen className="h-4 w-4 mr-1" />
                  Low Stock ({lowItems.length})
                </h3>
                <div className="space-y-2">
                  {lowItems.map((item) => (
                    <StockAlertItem
                      key={item.id}
                      item={item}
                      severity="low"
                      onRestock={onRestock}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            setIsRefreshing(true);
            await refetch();
            setIsRefreshing(false);
          }}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Refreshing...
            </>
          ) : (
            "Refresh Alerts"
          )}
        </Button>
        {/* <Button variant="link" size="sm" asChild>
          <Link href="/inventory">View All Inventory</Link>
        </Button> */}
      </CardFooter>
    </Card>
  );
}

interface StockAlertItemProps {
  item: Inventory;
  severity: "critical" | "low" | "expired" | "expiring";
  onRestock?: (itemId: number) => void;
}

function StockAlertItem({ item, severity, onRestock }: StockAlertItemProps) {
  // Format expiry date if present
  const formatExpiryDate = (date: Date | null) => {
    if (!date) return "N/A";

    const expiryDate = new Date(date);
    return expiryDate.toLocaleDateString();
  };

  // Get badge color based on severity
  const getBadgeClass = () => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "expired":
        return "bg-red-500";
      case "expiring":
        return "bg-amber-500";
      case "low":
        return "bg-amber-500";
      default:
        return "bg-primary";
    }
  };

  // Get alert message based on severity
  const getAlertMessage = () => {
    switch (severity) {
      case "critical":
        return `Critical: ${item.quantity} of ${item.minQuantity} ${
          item.unit || "units"
        } left`;
      case "expired":
        return `Expired on ${formatExpiryDate(item.expiryDate)}`;
      case "expiring":
        return `Expires on ${formatExpiryDate(item.expiryDate)}`;
      case "low":
        return `Low: ${item.quantity} of ${item.minQuantity} ${
          item.unit || "units"
        } left`;
      default:
        return "";
    }
  };

  return (
    <div className="flex justify-between items-center border rounded-md p-2">
      <div className="space-y-1">
        <div className="flex items-center">
          <span className="font-medium">{item.name}</span>
          <Badge variant="secondary" className="ml-2">
            {item.type}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">{getAlertMessage()}</div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={getBadgeClass()}>
          {severity === "expired"
            ? "Expired"
            : severity === "expiring"
            ? "Expiring Soon"
            : severity === "critical"
            ? "Critical"
            : "Low Stock"}
        </Badge>
        <Link href={`/admin/inventory/${item.id}`}>
          <Button variant="ghost" size="sm">
            Details
          </Button>
        </Link>
        {onRestock && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRestock(item.id)}
          >
            Restock
          </Button>
        )}
      </div>
    </div>
  );
}
