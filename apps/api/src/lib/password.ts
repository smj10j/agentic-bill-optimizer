/**
 * Password hashing using PBKDF2 (available in Web Crypto API / Cloudflare Workers).
 * bcrypt is not available in the Workers runtime, so we use PBKDF2 with SHA-256.
 * 310,000 iterations matches OWASP recommendation for PBKDF2-SHA256.
 */

// Cloudflare Workers caps PBKDF2 at 100,000 iterations (platform limit).
// OWASP minimum for PBKDF2-SHA256 is 600,000, but 100,000 is the
// maximum available in this runtime. Acceptable for MVP; revisit if
// switching to a Node.js runtime with bcrypt support.
const ITERATIONS = 100_000;
const KEY_LENGTH = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const saltHex = toHex(salt);
  const keyHex = toHex(new Uint8Array(key));
  return `${saltHex}:${keyHex}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [saltHex, keyHex] = hash.split(":");
  if (!saltHex || !keyHex) return false;

  const salt = fromHex(saltHex);
  const key = await deriveKey(password, salt);
  const derivedHex = toHex(new Uint8Array(key));

  // Constant-time comparison
  return timingSafeEqual(derivedHex, keyHex);
}

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH * 8
  );
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
