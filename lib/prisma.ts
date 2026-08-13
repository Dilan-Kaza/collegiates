import { PrismaClient } from "@prisma/client";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";

// Reuse one client across hot reloads in dev so connections aren't exhausted.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

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

/**
 * The application's single {@link PrismaClient}, backed by the Prisma Postgres
 * driver adapter.
 *
 * @remarks
 * `DATABASE_URL` must be the Prisma Postgres **Direct TCP** connection string.
 * An Accelerate `prisma+postgres://` URL is rejected by `@prisma/adapter-ppg`,
 * so this module throws at import time rather than failing on the first query.
 *
 * In development the instance is stashed on `globalThis`, because Next's hot
 * reload re-evaluates modules and would otherwise open a new connection pool on
 * every edit until the database refuses more.
 *
 * @example
 * ```ts
 * import prisma from "@/lib/prisma";
 * const user = await prisma.user.findUnique({ where: { email } });
 * ```
 */
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
