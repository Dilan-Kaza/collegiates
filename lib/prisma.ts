import { PrismaClient } from "@prisma/client";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";

// Reuse a single PrismaClient across hot reloads in dev to avoid exhausting
// database connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Connect to Prisma Postgres via its serverless driver adapter. DATABASE_URL
// must be the Prisma Postgres **Direct TCP** connection string, e.g.
// `postgres://<id>:<key>@db.prisma.io:5432/postgres?sslmode=require` — NOT the
// `prisma+postgres://accelerate.prisma-data.net/?api_key=...` Accelerate URL,
// which this adapter does not accept.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. It must be the Prisma Postgres Direct TCP URL " +
      "(postgres://<id>:<key>@db.prisma.io:5432/postgres?sslmode=require).",
  );
}
if (connectionString.startsWith("prisma+postgres://")) {
  throw new Error(
    "DATABASE_URL is a prisma+postgres:// Accelerate URL, which @prisma/adapter-ppg " +
      "does not accept. Use the Prisma Postgres Direct TCP URL " +
      "(postgres://<id>:<key>@db.prisma.io:5432/postgres?sslmode=require) instead.",
  );
}

const adapter = new PrismaPostgresAdapter({ connectionString });

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
