import crypto from "crypto";

/**
 * Django-compatible PBKDF2 password hashing.
 *
 * @remarks
 * The encoded format is Django's: `pbkdf2_sha256$<iterations>$<salt>$<base64 hash>`.
 * Keeping it means every password inherited from the old Django backend still
 * verifies, and nobody had to be forced through a reset during the port.
 *
 * **Do not change the algorithm or the encoding** without a migration plan for
 * the existing hashes — they are the only copy of those credentials.
 *
 * @packageDocumentation
 */

const ALGORITHM = "pbkdf2_sha256";
const DEFAULT_ITERATIONS = 600000; // Django 4.x/5.x default range
const KEY_LEN = 32; // 256-bit derived key
const DIGEST = "sha256";

function pbkdf2(password: string, salt: string, iterations: number): string {
  return crypto
    .pbkdf2Sync(password, salt, iterations, KEY_LEN, DIGEST)
    .toString("base64");
}

/**
 * Hashes a password for storage, with a fresh random salt.
 *
 * @param password - The plaintext password.
 * @param iterations - PBKDF2 iterations. Defaults to 600,000, Django 4.x/5.x's
 * own default; the value is embedded in the output so raising it later still
 * leaves old hashes verifiable.
 * @returns The encoded hash to store in `users.password`.
 */
export function hashPassword(password: string, iterations: number = DEFAULT_ITERATIONS): string {
  const salt = crypto.randomBytes(12).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
  const hash = pbkdf2(password, salt, iterations);
  return `${ALGORITHM}$${iterations}$${salt}$${hash}`;
}

/**
 * Checks a password against a stored hash.
 *
 * @remarks
 * The iteration count and salt are read out of the encoded value, so hashes
 * written at any past setting still verify. The final comparison is
 * `timingSafeEqual`.
 *
 * @param password - The plaintext to check.
 * @param encoded - The stored hash. A null, malformed, or foreign-algorithm
 * value returns `false` rather than throwing.
 */
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
