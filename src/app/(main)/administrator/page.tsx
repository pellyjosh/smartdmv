
"use client";
import { useUser, type AdministratorUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react"; // Import React
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, Bell, Activity, BarChart3, PlusCircle, Trash2, Edit3, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const analyticsData = [
  { month: 'Dec', Revenue: 1500 },
  { month: 'Jan', Revenue: 2800 },
  { month: 'Feb', Revenue: 5200 },
  { month: 'Mar', Revenue: 4000 },
  { month: 'Apr', Revenue: 4000 },
  { month: 'May', Revenue: 1800 },
];


export default function AdministratorDashboardPage() {
  const { user, logout, isLoading, initialAuthChecked, switchPractice } = useUser();
  const router = useRouter();
  const [currentPracticeSelection, setCurrentPracticeSelection] = useState<string | undefined>(undefined);
  const [isSetupCompleted, setIsSetupCompleted] = useState(false); // Example state for setup status

  useEffect(() => {
    if (user && user.role === 'ADMINISTRATOR') {
      const adminUser = user as AdministratorUser;
      if (adminUser.currentPracticeId && adminUser.currentPracticeId !== currentPracticeSelection) {
        setCurrentPracticeSelection(adminUser.currentPracticeId);
      } else if (!adminUser.currentPracticeId && currentPracticeSelection !== undefined) {
        setCurrentPracticeSelection(undefined);
      }
    }
  }, [user]); 

  if (isLoading || !initialAuthChecked) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading, please wait...</p>
      </div>
    );
  }

  // if (!user) {
  //   return (
  //     <div className="flex flex-col justify-center items-center h-screen">
  //       <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
  //       <p className="text-lg text-muted-foreground">Redirecting to login...</p>
  //     </div>
  //   );
  // }

  // if (user.role !== 'ADMINISTRATOR') {
  //    router.push('/access-denied');
  //    return (
  //     <div className="flex flex-col justify-center items-center h-screen">
  //       <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
  //       <p className="text-lg text-muted-foreground">Access Denied. Redirecting...</p>
  //     </div>
  //   );
  // }

  const adminUser = user as AdministratorUser;

  const handlePracticeChange = async (newPracticeId: string) => {
    if (switchPractice && adminUser) {
      await switchPractice(newPracticeId);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">

      {!isSetupCompleted && (
        <Alert
        variant="default"
        className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
      >
        <XCircle className="h-5 w-5 !text-blue-500" />
        <AlertTitle className="font-semibold !text-blue-800 dark:!text-blue-200">
          Setup Not Started
        </AlertTitle>
        <AlertDescription>
          <div className="flex flex-col gap-2">
            <p>
              Your practice portal is ready, but you haven&apos;t completed the initial setup yet. Complete the guided setup process to get the most out of SmartDVM.
            </p>
            <div className="flex justify-end">
              <Button
                onClick={() => setIsSetupCompleted(true)}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Start Setup
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
        <div className="flex items-center gap-2">
          <Select defaultValue="default">
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="Select dashboard" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default" className="text-sm">Default View</SelectItem>
              <SelectItem value="financial" className="text-sm">Financial View</SelectItem>
              <SelectItem value="operational" className="text-sm">Operational View</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-9 w-9"><PlusCircle className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-9 w-9 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
          <Button variant="default" size="sm"><Edit3 className="mr-2 h-4 w-4" /> Edit Dashboard</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium text-primary">Recent Notifications</CardTitle>
            <Bell className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center">No notifications</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium text-primary">Practice Overview</CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">
              Key performance indicators and operational metrics for your practice.
            </p>
            <div className="text-sm text-muted-foreground py-4 text-center">No appointment data available</div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1"> {/* Make this card span full width on lg if it's the only one in its row for layout */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium text-primary">Practice Analytics</CardTitle>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <p className="text-xs text-muted-foreground mb-2">
              Customizable analytics charts and financial performance visualizations.
            </p>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        fontSize: '12px' 
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{fontSize: '12px'}} />
                  <Line type="monotone" dataKey="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Original content for reference, can be removed or integrated */}
      <p className="text-sm text-muted-foreground mt-4">
        Accessible practices: {adminUser.accessiblePracticeIds && adminUser.accessiblePracticeIds.length > 0
          ? adminUser.accessiblePracticeIds.map(id => id ? id.replace('practice_', '') : 'Unknown').join(', ')
          : 'No other practices accessible'}
      </p>
    </div>
  );
}

    