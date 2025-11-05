/**
 * Encryption utilities for offline storage
 * Uses simple obfuscation (as per requirement)
 */

/**
 * Simple obfuscation for JWT tokens
 * Note: This is NOT cryptographically secure, just obfuscation
 */
export function obfuscateToken(token: string): string {
  if (!token) return '';
  
  try {
    // Base64 encode + simple character substitution
    const base64 = btoa(token);
    const obfuscated = base64
      .split('')
      .map((char, index) => {
        const code = char.charCodeAt(0);
        const shift = (index % 5) + 1;
        return String.fromCharCode(code + shift);
      })
      .join('');
    
    return obfuscated;
  } catch (error) {
    console.error('[Encryption] Failed to obfuscate token:', error);
    return '';
  }
}

/**
 * Deobfuscate token
 */
export function deobfuscateToken(obfuscated: string): string {
  if (!obfuscated) return '';
  
  try {
    // Reverse the character substitution
    const base64 = obfuscated
      .split('')
      .map((char, index) => {
        const code = char.charCodeAt(0);
        const shift = (index % 5) + 1;
        return String.fromCharCode(code - shift);
      })
      .join('');
    
    // Base64 decode
    const token = atob(base64);
    return token;
  } catch (error) {
    console.error('[Encryption] Failed to deobfuscate token:', error);
    return '';
  }
}

/**
 * Generate a random ID for temporary entities
 */
export function generateTempId(prefix: string = 'temp'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Check if an ID is temporary
 */
export function isTempId(id: string | number): boolean {
  if (typeof id === 'number') return false;
  return id.toString().startsWith('temp_');
}

/**
 * Hash a string (simple hash for comparison)
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Obfuscate sensitive data in logs
 */
export function obfuscateSensitiveData(obj: any): any {
  if (!obj) return obj;
  
  const sensitiveFields = [
    'password',
    'token',
    'refreshToken',
    'ssn',
    'creditCard',
    'cvv',
    'pin',
  ];
  
  const obfuscated = { ...obj };
  
  for (const key in obfuscated) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      obfuscated[key] = '***REDACTED***';
    } else if (typeof obfuscated[key] === 'object' && obfuscated[key] !== null) {
      obfuscated[key] = obfuscateSensitiveData(obfuscated[key]);
    }
  }
  
  return obfuscated;
}
