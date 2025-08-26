import { NextRequest } from 'next/server';
import { db } from '@/db';
import { integrationApiKeys } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export interface ApiKeyValidationResult {
  isValid: boolean;
  practiceId?: number;
  keyInfo?: any;
  error?: string;
}

export async function validateApiKey(request: NextRequest): Promise<ApiKeyValidationResult> {
  try {
    const authHeader = request.headers.get('authorization');
    const practiceIdHeader = request.headers.get('x-practice-id');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isValid: false, error: 'Missing or invalid authorization header' };
    }

    if (!practiceIdHeader) {
      return { isValid: false, error: 'Missing X-Practice-ID header' };
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
    const practiceId = parseInt(practiceIdHeader);

    if (isNaN(practiceId)) {
      return { isValid: false, error: 'Invalid practice ID' };
    }

    // Hash the provided API key to compare with stored hash
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Find the API key record
    const apiKeyRecord = await db.query.integrationApiKeys.findFirst({
      where: and(
        eq(integrationApiKeys.practiceId, practiceId),
        eq(integrationApiKeys.keyHash, keyHash),
        eq(integrationApiKeys.isActive, true)
      )
    });

    if (!apiKeyRecord) {
      return { isValid: false, error: 'Invalid API key' };
    }

    // Check rate limits (basic implementation)
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // In a production environment, you'd want to implement proper rate limiting
    // This is a simplified check
    if (apiKeyRecord.lastUsedAt) {
      const timeDiff = now.getTime() - apiKeyRecord.lastUsedAt.getTime();
      if (timeDiff < 1000) { // Basic rate limiting - max 1 request per second
        return { isValid: false, error: 'Rate limit exceeded' };
      }
    }

    // Update last used timestamp
    await db
      .update(integrationApiKeys)
      .set({ lastUsedAt: now })
      .where(eq(integrationApiKeys.id, apiKeyRecord.id));

    return {
      isValid: true,
      practiceId: practiceId,
      keyInfo: {
        keyName: apiKeyRecord.keyName,
        permissions: typeof apiKeyRecord.permissions === 'string' 
          ? JSON.parse(apiKeyRecord.permissions || '[]')
          : apiKeyRecord.permissions || [],
        scopes: typeof apiKeyRecord.scopes === 'string'
          ? JSON.parse(apiKeyRecord.scopes || '[]') 
          : apiKeyRecord.scopes || []
      }
    };
  } catch (error) {
    console.error('Error validating API key:', error);
    return { isValid: false, error: 'Internal server error during API key validation' };
  }
}

export function hasPermission(keyInfo: any, requiredPermission: string): boolean {
  const permissions = keyInfo.permissions || [];
  return permissions.includes(requiredPermission) || permissions.includes('write');
}

export function hasScope(keyInfo: any, requiredScope: string): boolean {
  const scopes = keyInfo.scopes || [];
  return scopes.includes(requiredScope) || scopes.includes('*');
}
