import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Settings } from "lucide-react";
import { WidgetConfig, DashboardConfigData } from "@/hooks/use-dashboard-config";
import { AppointmentsWidget } from "./widgets/appointments-widget";
import { WhiteboardWidget } from "./widgets/whiteboard-widget";
import { NotificationsWidget } from "./widgets/notifications-widget";
import { HealthPlansWidget } from "./widgets/health-plans-widget";
import { PetStatsWidget } from "./widgets/pet-stats-widget";
import { PracticeStatsWidget } from "./widgets/practice-stats-widget";
import { ChartWidget } from "./widgets/chart-widget";

interface DashboardProps {
  config?: DashboardConfigData;
  isEditing: boolean;
  isLoading?: boolean;
  onEditWidget: (widget: WidgetConfig) => void;
  onRemoveWidget: (widgetId: string) => void;
  onAddWidget: () => void;
  onSaveLayout: () => void;
}

export function Dashboard({
  config,
  isEditing,
  isLoading = false,
  onEditWidget,
  onRemoveWidget,
  onAddWidget,
  onSaveLayout,
}: DashboardProps) {
  const [layout, setLayout] = useState<any[]>([]);

  useEffect(() => {
    if (config) {
      // Set initial layout from config
      const initialLayout = config.widgets.map(widget => ({
        ...widget.position,
        i: widget.id
      }));
      setLayout(initialLayout);
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!config || !config.widgets || config.widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-6">
        <h3 className="text-2xl font-semibold mb-4">
          No widgets have been added to your dashboard yet
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Add widgets to customize your dashboard and get a quick overview of your practice.
        </p>
        <Button onClick={onAddWidget}>Add Your First Widget</Button>
      </div>
    );
  }

  const renderWidget = (widget: WidgetConfig) => {
    switch (widget.type) {
      case "appointments":
        return <AppointmentsWidget widget={widget} />;
      case "whiteboard":
        return <WhiteboardWidget widget={widget} />;
      case "notifications":
        return <NotificationsWidget widget={widget} />;
    //   case "healthPlans":
    //     return <HealthPlansWidget widget={widget} />;
      case "petStats":
        return <PetStatsWidget widget={widget} />;
      case "practiceStats":
        return <PracticeStatsWidget widget={widget} />;
      case "chart":
        return <ChartWidget widget={widget} />;
      default:
        return <div>Unknown widget type</div>;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {config.widgets.map((widget) => (
        <Card key={widget.id} className="shadow-md">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{widget.title}</CardTitle>
            {isEditing && (
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEditWidget(widget)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveWidget(widget.id)}
                >
                  <span className="text-red-500">×</span>
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>{renderWidget(widget)}</CardContent>
        </Card>
      ))}
      {isEditing && (
        <Card className="shadow-md flex flex-col items-center justify-center h-40 border-dashed">
          <Button variant="ghost" onClick={onAddWidget}>
            + Add Widget
          </Button>
        </Card>
      )}
    </div>
  );
}