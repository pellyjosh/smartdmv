// Network utility functions for handling connectivity issues

export interface NetworkError {
  isNetworkError: boolean;
  isTimeoutError: boolean;
  isDatabaseError: boolean;
  userMessage: string;
  technicalMessage: string;
  retryable: boolean;
}

export function analyzeError(error: any): NetworkError {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorStack = error?.stack?.toLowerCase() || '';
  const errorName = error?.name?.toLowerCase() || '';

  // Check for various network-related errors
  const networkIndicators = [
    'fetch failed',
    'network error',
    'connection refused',
    'connection timeout',
    'dns',
    'enotfound',
    'econnrefused',
    'econnreset',
    'etimedout',
    'socket hang up',
    'network is unreachable',
    'no internet connection'
  ];

  const databaseIndicators = [
    'neondbError',
    'error connecting to database',
    'database connection failed',
    'connection pool',
    'database timeout'
  ];

  const timeoutIndicators = [
    'timeout',
    'timed out',
    'request timeout',
    'connection timeout'
  ];

  const isNetworkError = networkIndicators.some(indicator => 
    errorMessage.includes(indicator) || errorStack.includes(indicator)
  );

  const isDatabaseError = databaseIndicators.some(indicator => 
    errorMessage.includes(indicator) || errorStack.includes(indicator) || errorName.includes(indicator)
  );

  const isTimeoutError = timeoutIndicators.some(indicator => 
    errorMessage.includes(indicator) || errorStack.includes(indicator)
  );

  // Determine user-friendly message
  let userMessage = 'An unexpected error occurred. Please try again.';
  let retryable = false;

  if (isNetworkError || isDatabaseError) {
    if (isTimeoutError) {
      userMessage = 'The connection is taking longer than expected. Please check your internet connection and try again.';
      retryable = true;
    } else {
      userMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      retryable = true;
    }
  }

  return {
    isNetworkError: isNetworkError || isDatabaseError,
    isTimeoutError,
    isDatabaseError,
    userMessage,
    technicalMessage: error?.message || 'Unknown error',
    retryable
  };
}

export async function checkInternetConnectivity(): Promise<boolean> {
  try {
    // Try to fetch a small resource to check connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('/api/health', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('[Network Check] Internet connectivity check failed:', error);
    return false;
  }
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const networkError = analyzeError(error);
      
      // Don't retry if it's not a network/retryable error
      if (!networkError.retryable || attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
