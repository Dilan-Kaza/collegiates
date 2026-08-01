import crypto from "crypto";

// Django-compatible PBKDF2 hashing, so passwords round-trip with the old backend.
// Format: pbkdf2_sha256$<iterations>$<salt>$<base64 hash>

const ALGORITHM = "pbkdf2_sha256";
const DEFAULT_ITERATIONS = 600000; // Django 4.x/5.x default range
const KEY_LEN = 32; // 256-bit derived key
const DIGEST = "sha256";

function pbkdf2(password: string, salt: string, iterations: number): string {
  return crypto
    .pbkdf2Sync(password, salt, iterations, KEY_LEN, DIGEST)
    .toString("base64");
}

export function hashPassword(password: string, iterations: number = DEFAULT_ITERATIONS): string {
  const salt = crypto.randomBytes(12).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
  const hash = pbkdf2(password, salt, iterations);
  return `${ALGORITHM}$${iterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, encoded: string | null | undefined): boolean {
  if (!encoded || typeof encoded !== "string") return false;
  const parts = encoded.split("$");
  if (parts.length !== 4) return false;
  const [algorithm, iterationsStr, salt, expected] = parts;
  if (algorithm !== ALGORITHM) return false;
  const iterations = parseInt(iterationsStr, 10);
  const actual = pbkdf2(password, salt, iterations);
  // constant-time compare
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
