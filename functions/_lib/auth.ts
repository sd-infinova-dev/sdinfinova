// Cloudflare Edge Authentication Utilities using Web Crypto API

export async function hashPasswordPbkdf2(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(derivedBits)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2$sha256$100000$${saltHex}$${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || typeof storedHash !== 'string') return false;

  if (storedHash.startsWith('pbkdf2$sha256$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 5) return false;
    const iterations = parseInt(parts[2], 10);
    if (!Number.isInteger(iterations) || iterations < 50000 || iterations > 100000) return false;
    const saltHex = parts[3];
    const expectedHashHex = parts[4];
    if (saltHex.length !== 32 || expectedHashHex.length !== 64) return false;

    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const actualHashHex = Array.from(new Uint8Array(derivedBits)).map((b) => b.toString(16).padStart(2, '0')).join('');
    return timingSafeEqualStr(actualHashHex, expectedHashHex);
  }

  return false;
}

export async function sha256Hex(data: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(data));
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function generateSecureToken(byteLength: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
