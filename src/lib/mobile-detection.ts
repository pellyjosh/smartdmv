/**
 * Mobile detection utilities
 */

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check user agent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Mobile user agent patterns
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  
  // Check screen size (width less than 768px is considered mobile/tablet)
  const isSmallScreen = window.innerWidth < 768;
  
  // Check if it's a touch device
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return mobileRegex.test(userAgent) || (isSmallScreen && isTouchDevice);
}

export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent;
  const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet/i;
  const isTabletSize = window.innerWidth >= 768 && window.innerWidth <= 1024;
  
  return tabletRegex.test(userAgent) || isTabletSize;
}

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (isMobileDevice()) return 'mobile';
  if (isTabletDevice()) return 'tablet';
  return 'desktop';
}
