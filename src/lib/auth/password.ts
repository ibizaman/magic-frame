import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 1 << 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;
const SCRYPT_MAXMEM = 128 * 1024 * 1024;

export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_LEN);
  const derived = scryptSync(plain.normalize("NFKC"), salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = scryptSync(plain.normalize("NFKC"), salt, expected.length, {
    N: Number(nStr),
    r: Number(rStr),
    p: Number(pStr),
    maxmem: SCRYPT_MAXMEM,
  });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
