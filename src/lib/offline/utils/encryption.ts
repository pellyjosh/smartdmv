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
    return atob(base64);
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

function enc(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function ab2b64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b642ab(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getDeviceSecret(): Promise<ArrayBuffer> {
  const key = 'smartdmv_device_secret';
  let existing = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  if (!existing) {
    const random = crypto.getRandomValues(new Uint8Array(32));
    let bin = '';
    for (let i = 0; i < random.length; i++) bin += String.fromCharCode(random[i]);
    const b64 = btoa(bin);
    if (typeof window !== 'undefined') window.localStorage.setItem(key, b64);
    existing = b64;
  }
  return b642ab(existing!);
}

export async function deriveKey(tenantId: string, practiceId: number): Promise<CryptoKey> {
  const secret = await getDeviceSecret();
  const baseKey = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
  const salt = new Uint8Array(enc(`${tenantId}|${practiceId}`));
  const info = new Uint8Array(enc('smartdmv-offline'));
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptObject(data: any, key: CryptoKey, aad?: Uint8Array): Promise<{ v: number; alg: string; iv: string; ct: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = enc(JSON.stringify(data));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, plaintext);
  return { v: 1, alg: 'AES-GCM', iv: ab2b64(iv.buffer), ct: ab2b64(ct) };
}

export async function decryptObject<T = any>(blob: { v: number; alg: string; iv: string; ct: string }, key: CryptoKey, aad?: Uint8Array): Promise<T> {
  const iv = b642ab(blob.iv);
  const cipher = b642ab(blob.ct);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as ArrayBuffer, additionalData: aad }, key, cipher);
  const text = new TextDecoder().decode(pt);
  return JSON.parse(text);
}

export async function encryptString(str: string, tenantId: string, practiceId: number): Promise<string> {
  const key = await deriveKey(tenantId, practiceId);
  const blob = await encryptObject({ s: str }, key, enc(`${tenantId}|${practiceId}|ls`));
  return JSON.stringify(blob);
}

export async function decryptString(payload: string, tenantId: string, practiceId: number): Promise<string> {
  const key = await deriveKey(tenantId, practiceId);
  const blob = JSON.parse(payload);
  const obj = await decryptObject<{ s: string }>(blob, key, enc(`${tenantId}|${practiceId}|ls`));
  return obj.s;
}

async function deriveKeyForLocalStorage(): Promise<CryptoKey> {
  const secret = await getDeviceSecret();
  const baseKey = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
  const salt = new Uint8Array(enc(''));
  const info = new Uint8Array(enc('smartdmv-offline-ls'));
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptStringDS(str: string): Promise<string> {
  const key = await deriveKeyForLocalStorage();
  const blob = await encryptObject({ s: str }, key, enc('ls'));
  return JSON.stringify(blob);
}

export async function decryptStringDS(payload: string): Promise<string> {
  const key = await deriveKeyForLocalStorage();
  const blob = JSON.parse(payload);
  const obj = await decryptObject<{ s: string }>(blob, key, enc('ls'));
  return obj.s;
}
