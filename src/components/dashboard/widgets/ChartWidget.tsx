import React from "react";
import {
  LineChart,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { WidgetConfig } from "@/hooks/use-dashboard-config";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";

interface ChartWidgetProps {
  widget: WidgetConfig;
}

// Mock chart data - replace with real data and chart library
const mockChartData = {
  revenue: {
    current: 87500,
    previous: 76200,
    trend: "up",
    percentage: 14.8,
  },
  appointments: {
    current: 1247,
    previous: 1156,
    trend: "up",
    percentage: 7.9,
  },
  patientGrowth: {
    current: 2340,
    previous: 2201,
    trend: "up",
    percentage: 6.3,
  },
};

// Simple bar chart representation
const SimpleBarChart = ({ data }: { data: any }) => {
  return (
    <div className="space-y-2">
      {Object.entries(data).map(([key, value]: [string, any]) => (
        <div key={key} className="flex items-center space-x-2">
          <span className="text-xs w-16 text-muted-foreground capitalize">
            {key}
          </span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{
                width: `${Math.min((value.current / 100000) * 100, 100)}%`,
              }}
            ></div>
          </div>
          <span className="text-xs font-medium w-12 text-right">
            {typeof value.current === "number"
              ? value.current.toLocaleString()
              : value.current}
          </span>
        </div>
      ))}
    </div>
  );
};

export const ChartWidget: React.FC<ChartWidgetProps> = ({ widget }) => {
  const chartType = widget.settings?.chartType || "revenue";
  const { practiceCurrency } = useCurrencyFormatter();
  const currencySymbol = practiceCurrency?.symbol;

  return (
    <div className="space-y-4">
      {/* Chart Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-sm capitalize">
            {chartType} Analytics
          </span>
        </div>
        <div className="flex items-center space-x-1 text-xs">
          {mockChartData[chartType as keyof typeof mockChartData]?.trend ===
          "up" ? (
            <TrendingUp className="h-3 w-3 text-green-600" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-600" />
          )}
          <span
            className={`font-medium ${
              mockChartData[chartType as keyof typeof mockChartData]?.trend ===
              "up"
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {mockChartData[chartType as keyof typeof mockChartData]?.percentage}
            %
          </span>
        </div>
      </div>

      {/* Current vs Previous Period */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 mb-1">Current Period</p>
          <p className="text-lg font-bold text-blue-900">
            {chartType === "revenue" ? currencySymbol : ""}
            {mockChartData[
              chartType as keyof typeof mockChartData
            ]?.current.toLocaleString()}
          </p>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-700 mb-1">Previous Period</p>
          <p className="text-lg font-bold text-gray-900">
            {chartType === "revenue" ? currencySymbol : ""}
            {mockChartData[
              chartType as keyof typeof mockChartData
            ]?.previous.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Simple Chart Visualization */}
      <div className="p-3 border rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium">Trend Overview</span>
          <span className="text-xs text-muted-foreground">Last 7 days</span>
        </div>

        {/* Mock chart bars */}
        <div className="flex items-end justify-between h-16 space-x-1">
          {[65, 78, 82, 71, 89, 94, 100].map((height, index) => (
            <div
              key={index}
              className="bg-blue-600 rounded-t-sm flex-1"
              style={{ height: `${height}%` }}
            ></div>
          ))}
        </div>

        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="text-center pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          {chartType === "revenue"
            ? "Revenue"
            : chartType === "appointments"
            ? "Bookings"
            : "Growth"}{" "}
          trending{" "}
          <span
            className={`font-medium ${
              mockChartData[chartType as keyof typeof mockChartData]?.trend ===
              "up"
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {mockChartData[chartType as keyof typeof mockChartData]?.trend ===
            "up"
              ? "upward"
              : "downward"}
          </span>
        </p>
      </div>
    </div>
  );
};
