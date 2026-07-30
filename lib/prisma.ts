import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Reuse a single PrismaClient across hot reloads in dev to avoid exhausting
// database connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Connect to Prisma Postgres via node-postgres (pg) over plain TCP.
// DATABASE_URL must be the Prisma Postgres **Direct TCP** connection string,
// e.g. `postgres://<id>:<key>@db.prisma.io:5432/postgres?sslmode=require` —
// NOT the `prisma+postgres://accelerate.prisma-data.net/?api_key=...`
// Accelerate URL, which this adapter does not accept.
//
// Previously used @prisma/adapter-ppg (the WebSocket-based serverless
// driver): its transport never recovers once its socket closes — connect()
// only (re)dials when its internal handle is unset, which a closed-but-not-
// yet-nulled socket doesn't satisfy — so every query on that client fails
// with "WebSocket is not connected" until the process restarts. pg's pool
// reconnects on its own, so that failure mode doesn't exist here.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. It must be the Prisma Postgres Direct TCP URL " +
      "(postgres://<id>:<key>@db.prisma.io:5432/postgres?sslmode=require).",
  );
}
if (connectionString.startsWith("prisma+postgres://")) {
  throw new Error(
    "DATABASE_URL is a prisma+postgres:// Accelerate URL, which @prisma/adapter-pg " +
      "does not accept. Use the Prisma Postgres Direct TCP URL " +
      "(postgres://<id>:<key>@db.prisma.io:5432/postgres?sslmode=require) instead.",
  );
}

const adapter = new PrismaPg({ connectionString });

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
