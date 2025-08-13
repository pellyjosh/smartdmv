// API middleware for handling network errors globally
import { NextRequest, NextResponse } from 'next/server';
import { analyzeError } from '@/lib/network-utils';

export type ApiHandler = (request: NextRequest, ...args: any[]) => Promise<NextResponse> | NextResponse;

/**
 * Wrapper function that adds global error handling to API routes
 * This catches network errors and database connection issues automatically
 */
export function withNetworkErrorHandling(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      const networkError = analyzeError(error);
      
      // Log the error with detailed information
      console.error('[API Error Handler]', {
        path: request.nextUrl.pathname,
        method: request.method,
        isNetworkError: networkError.isNetworkError,
        isDatabaseError: networkError.isDatabaseError,
        userMessage: networkError.userMessage,
        technicalMessage: networkError.technicalMessage,
        originalError: error
      });

      // For network/database errors, return user-friendly messages
      if (networkError.isNetworkError || networkError.isDatabaseError) {
        return NextResponse.json(
          { 
            error: networkError.userMessage,
            isNetworkError: networkError.isNetworkError,
            isDatabaseError: networkError.isDatabaseError,
            retryable: networkError.retryable
          }, 
          { 
            status: 503, // Service Unavailable
            headers: {
              'Retry-After': '5', // Suggest retry after 5 seconds
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          }
        );
      }

      // For other errors, return generic server error
      return NextResponse.json(
        { 
          error: 'An unexpected error occurred. Please try again later.',
          retryable: false
        },
        { 
          status: 500,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      );
    }
  };
}

/**
 * Enhanced wrapper that also includes retry logic for database operations
 */
export function withNetworkErrorHandlingAndRetry(handler: ApiHandler, maxRetries: number = 2): ApiHandler {
  return async (request: NextRequest, ...args: any[]) => {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await handler(request, ...args);
      } catch (error) {
        lastError = error;
        const networkError = analyzeError(error);
        
        // Don't retry if it's not a retryable error or if we've reached max attempts
        if (!networkError.retryable || attempt === maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff (1s, 2s, 4s)
        const delay = 1000 * Math.pow(2, attempt);
        console.log(`[API Retry] Attempt ${attempt + 1} failed for ${request.nextUrl.pathname}, retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we get here, all retries failed - use the standard error handler
    return withNetworkErrorHandling(async () => {
      throw lastError;
    })(request, ...args);
  };
}
