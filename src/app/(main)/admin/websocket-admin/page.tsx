'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  webSocketManager, 
  whiteboardService, 
  telemedicineService, 
  WebSocketStatus 
} from "@/lib/websocket/";
import { useEffect, useState } from "react";
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  Activity, 
  Users, 
  MessageSquare,
  Monitor,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from "lucide-react";

interface ServiceStatus {
  name: string;
  status: WebSocketStatus;
  connected: boolean;
  messageTypes: string[];
}

export default function WebSocketAdminPage() {
  const [globalStatus, setGlobalStatus] = useState<WebSocketStatus>(WebSocketStatus.DISCONNECTED);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeHandlers, setActiveHandlers] = useState<string[]>([]);

  useEffect(() => {
    // Monitor global WebSocket status
    const unsubscribeGlobal = webSocketManager.onStatusChange((status) => {
      setGlobalStatus(status);
    });

    // Monitor service statuses
    const updateServiceStatuses = () => {
      const serviceConfigs = webSocketManager.getServices();
      const serviceStatuses: ServiceStatus[] = Object.entries(serviceConfigs).map(([key, config]) => ({
        name: config.name,
        status: webSocketManager.getStatus(),
        connected: webSocketManager.getStatus() === WebSocketStatus.CONNECTED,
        messageTypes: config.messageTypes
      }));
      setServices(serviceStatuses);
    };

    // Update handlers list
    const updateHandlers = () => {
      setActiveHandlers(webSocketManager.getActiveHandlers());
    };

    // Initial update
    setGlobalStatus(webSocketManager.getStatus());
    updateServiceStatuses();
    updateHandlers();

    // Update every 5 seconds
    const interval = setInterval(() => {
      updateServiceStatuses();
      updateHandlers();
    }, 5000);

    return () => {
      unsubscribeGlobal();
      clearInterval(interval);
    };
  }, []);

  const handleConnect = () => {
    webSocketManager.connect();
  };

  const handleDisconnect = () => {
    webSocketManager.disconnect();
  };

  const handleTestWhiteboard = () => {
    whiteboardService.sendWhiteboardUpdate(1, { test: true, timestamp: Date.now() });
  };

  const getStatusColor = (status: WebSocketStatus) => {
    switch (status) {
      case WebSocketStatus.CONNECTED:
        return 'text-green-600 bg-green-50 border-green-200';
      case WebSocketStatus.CONNECTING:
      case WebSocketStatus.RECONNECTING:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case WebSocketStatus.ERROR:
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: WebSocketStatus) => {
    switch (status) {
      case WebSocketStatus.CONNECTED:
        return <CheckCircle className="h-4 w-4" />;
      case WebSocketStatus.CONNECTING:
      case WebSocketStatus.RECONNECTING:
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case WebSocketStatus.ERROR:
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <WifiOff className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-full">
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">WebSocket Management</h1>
            <Badge className={getStatusColor(globalStatus)}>
              <div className="flex items-center gap-1">
                {getStatusIcon(globalStatus)}
                <span className="capitalize">{globalStatus}</span>
              </div>
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleConnect}
              disabled={globalStatus === WebSocketStatus.CONNECTED}
            >
              <Wifi className="h-4 w-4 mr-2" />
              Connect
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDisconnect}
              disabled={globalStatus === WebSocketStatus.DISCONNECTED}
            >
              <WifiOff className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Connection Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge className={getStatusColor(globalStatus)}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(globalStatus)}
                      <span className="capitalize">{globalStatus}</span>
                    </div>
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active Handlers:</span>
                  <span className="text-sm text-gray-600">{activeHandlers.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Services:</span>
                  <span className="text-sm text-gray-600">{services.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services Status */}
          {services.map((service) => (
            <Card key={service.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  {service.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge className={getStatusColor(service.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(service.status)}
                        <span className="capitalize">{service.status}</span>
                      </div>
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Message Types:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {service.messageTypes.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Active Message Handlers */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Active Message Handlers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeHandlers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No active message handlers</p>
                </div>
              ) : (
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {activeHandlers.map((handler) => (
                    <Badge key={handler} variant="outline" className="justify-center p-2">
                      {handler}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Actions */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Test Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleTestWhiteboard}
                  disabled={globalStatus !== WebSocketStatus.CONNECTED}
                >
                  Test Whiteboard Message
                </Button>
                <Button 
                  variant="outline"
                  disabled={globalStatus !== WebSocketStatus.CONNECTED}
                  onClick={() => {
                    telemedicineService.sendChatMessage(
                      'test-room',
                      1,
                      'Test message from admin panel',
                      'admin',
                      1
                    );
                  }}
                >
                  Test Telemedicine Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
