"use client";

import { useEffect, useState } from 'react';
import { isMobileDevice, isTabletDevice, getDeviceType } from '@/lib/mobile-detection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, Smartphone, Tablet, ExternalLink } from 'lucide-react';

interface MobileBlockerProps {
  children: React.ReactNode;
  allowTablets?: boolean;
  customMessage?: string;
}

export function MobileBlocker({ children, allowTablets = false, customMessage }: MobileBlockerProps) {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setDeviceType(getDeviceType());

    // Re-check on window resize
    const handleResize = () => {
      setDeviceType(getDeviceType());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Don't block during SSR
  if (!isClient) {
    return <>{children}</>;
  }

  // Allow bypass for development with environment variable
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DISABLE_MOBILE_BLOCK === 'true') {
    return <>{children}</>;
  }

  // Check if we should block this device
  const shouldBlock = deviceType === 'mobile' || (!allowTablets && deviceType === 'tablet');

  if (!shouldBlock) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            {deviceType === 'mobile' ? (
              <Smartphone className="h-8 w-8 text-blue-600" />
            ) : (
              <Tablet className="h-8 w-8 text-blue-600" />
            )}
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            Desktop Required
          </CardTitle>
          <CardDescription className="text-gray-600">
            {customMessage || "SmartDVM is optimized for desktop use"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-700">
              For the best experience and full functionality, please access SmartDVM on a desktop or laptop computer.
            </p>
            
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Monitor className="h-4 w-4" />
              <span>Desktop or laptop recommended</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 text-sm">Why desktop?</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Better screen real estate for complex veterinary workflows</li>
              <li>• Enhanced data entry and form management</li>
              <li>• Optimized for professional use</li>
              <li>• Full keyboard and mouse support</li>
            </ul>
          </div>

          <div className="pt-4 space-y-2">
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
              variant="outline"
            >
              Check Again
            </Button>
            
            <Button 
              onClick={() => {
                // Try to open in a new tab/window (desktop browser)
                window.open(window.location.href, '_blank');
              }}
              className="w-full"
              variant="default"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Desktop Browser
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
