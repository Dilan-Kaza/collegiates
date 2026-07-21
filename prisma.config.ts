import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Connection URL used by the Prisma CLI (migrate, generate, studio).
    // The runtime client connects via a driver adapter in lib/prisma.ts.
    url: env("DATABASE_URL"),
  },
  migrations: {
    // Reference-data seed (colleges + events). Node 24+ runs .ts directly.
    seed: "node prisma/seed.ts",
  },
});
