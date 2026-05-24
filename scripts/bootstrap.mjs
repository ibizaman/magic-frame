/**
 * Container-Bootstrap. Läuft beim Container-Start vor `node server.js`.
 *
 * Macht jetzt fast nichts mehr: der erste Admin-User wird über die UI
 * angelegt (First-Run-Setup-Flow auf /login, /api/auth/setup).
 *
 * Backward-Compat: falls jemand noch ADMIN_EMAIL + ADMIN_PASSWORD als
 * env-Vars gesetzt hat (älteres Setup), wird der Admin trotzdem hier
 * gestartet — aber nur wenn die User-Tabelle leer ist. Empfehlung:
 * Variablen aus der .env entfernen, sobald der Admin existiert.
 */
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes, scryptSync } from "node:crypto";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log(
    "[bootstrap] Kein ADMIN_EMAIL/ADMIN_PASSWORD gesetzt — Admin wird beim ersten Aufruf in der UI angelegt (Setup-Flow auf /login).",
  );
  process.exit(0);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hashPassword(plain) {
  const N = 1 << 15;
  const r = 8;
  const p = 1;
  const salt = randomBytes(16);
  const derived = scryptSync(plain.normalize("NFKC"), salt, 64, {
    N,
    r,
    p,
    maxmem: 128 * 1024 * 1024,
  });
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

try {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log(
      "[bootstrap] User-Tabelle nicht leer — Admin-Seed übersprungen. Du kannst ADMIN_EMAIL/ADMIN_PASSWORD jetzt aus .env entfernen.",
    );
    process.exit(0);
  }

  const email = ADMIN_EMAIL.toLowerCase().trim();
  await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(ADMIN_PASSWORD),
      role: "admin",
    },
  });
  console.log(
    `[bootstrap] Admin-User "${email}" angelegt aus env-Vars (legacy). Bitte ADMIN_EMAIL/ADMIN_PASSWORD jetzt aus .env entfernen.`,
  );
} catch (err) {
  console.error("[bootstrap] Fehler:", err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
