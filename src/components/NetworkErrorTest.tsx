'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wifi, WifiOff, Database, AlertTriangle, CheckCircle } from 'lucide-react';

export default function NetworkErrorTest() {
  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const [isTestingLogin, setIsTestingLogin] = useState(false);
  const [healthResult, setHealthResult] = useState<any>(null);
  const [loginResult, setLoginResult] = useState<any>(null);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');

  const testHealthEndpoint = async () => {
    setIsTestingHealth(true);
    setHealthResult(null);
    
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthResult({
        success: response.ok,
        status: response.status,
        data,
        message: response.ok ? 'Health check successful' : 'Health check failed'
      });
    } catch (error: any) {
      setHealthResult({
        success: false,
        status: 0,
        data: null,
        message: error.message || 'Network error occurred',
        error: error.toString()
      });
    } finally {
      setIsTestingHealth(false);
    }
  };

  const testLoginAction = async () => {
    setIsTestingLogin(true);
    setLoginResult(null);
    
    try {
      // Import the login action dynamically to test it
      const { loginUserAction } = await import('@/actions/authActions');
      
      // Try to login with invalid credentials to test error handling
      const result = await loginUserAction('test@nonexistent.com', 'wrongpassword');
      setLoginResult({
        success: true,
        data: result,
        message: 'Login successful (unexpected)'
      });
    } catch (error: any) {
      setLoginResult({
        success: false,
        data: null,
        message: error.message || 'Login error occurred',
        error: error.toString()
      });
    } finally {
      setIsTestingLogin(false);
    }
  };

  const checkNetworkStatus = async () => {
    try {
      const online = navigator.onLine;
      if (!online) {
        setNetworkStatus('offline');
        return;
      }

      // Try a simple ping to our health endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      setNetworkStatus('online');
    } catch (error) {
      setNetworkStatus('offline');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Network Error Handling Test</h1>
        <p className="text-muted-foreground">
          Test the robust network error handling and retry logic
        </p>
      </div>

      {/* Network Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {networkStatus === 'online' && <Wifi className="h-5 w-5 text-green-500" />}
            {networkStatus === 'offline' && <WifiOff className="h-5 w-5 text-red-500" />}
            {networkStatus === 'unknown' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
            Network Status
          </CardTitle>
          <CardDescription>
            Check the current network connectivity status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={checkNetworkStatus} variant="outline">
              Check Network Status
            </Button>
            <Badge 
              variant={
                networkStatus === 'online' ? 'default' : 
                networkStatus === 'offline' ? 'destructive' : 
                'secondary'
              }
            >
              {networkStatus.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Browser reports: {navigator.onLine ? 'Online' : 'Offline'}
          </p>
        </CardContent>
      </Card>

      {/* Health Check Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Health Check Test
          </CardTitle>
          <CardDescription>
            Test the /api/health endpoint for database connectivity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testHealthEndpoint} 
            disabled={isTestingHealth}
            className="w-full"
          >
            {isTestingHealth && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Health Endpoint
          </Button>
          
          {healthResult && (
            <Alert variant={healthResult.success ? "default" : "destructive"}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {healthResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <strong>{healthResult.message}</strong>
                  </div>
                  <div className="text-sm">
                    <p>Status: {healthResult.status}</p>
                    {healthResult.data && (
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(healthResult.data, null, 2)}
                      </pre>
                    )}
                    {healthResult.error && (
                      <p className="text-red-600 mt-2">Error: {healthResult.error}</p>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Login Action Test */}
      <Card>
        <CardHeader>
          <CardTitle>Login Action Test</CardTitle>
          <CardDescription>
            Test the login action with retry logic and error handling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testLoginAction} 
            disabled={isTestingLogin}
            className="w-full"
            variant="outline"
          >
            {isTestingLogin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Login with Invalid Credentials
          </Button>
          
          {loginResult && (
            <Alert variant={loginResult.success ? "default" : "destructive"}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {loginResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <strong>{loginResult.message}</strong>
                  </div>
                  <div className="text-sm">
                    {loginResult.data && (
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(loginResult.data, null, 2)}
                      </pre>
                    )}
                    {loginResult.error && (
                      <p className="text-red-600 mt-2">Full Error: {loginResult.error}</p>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>To test network error handling:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>First, test when everything is working normally</li>
            <li>Turn off your internet connection or simulate network issues</li>
            <li>Try the health check - should show user-friendly error messages</li>
            <li>Try the login action - should handle database connection errors gracefully</li>
            <li>Observe that the error messages are user-friendly, not technical database errors</li>
          </ol>
          <p className="text-muted-foreground mt-4">
            The retry logic will automatically attempt failed operations 2-3 times with exponential backoff.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
