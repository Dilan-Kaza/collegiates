import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";
import { colleges } from "./seed-data/colleges.ts";
import { events } from "./seed-data/events.ts";
import { skillLevelByCode, genderByCode, eventCategoryFor, weaponTypeBySuffix } from "./seed-data/event-codes.ts";

// Reference-data seed (colleges + events). Run with: npm run seed.
// Builds its own client so it works under `node prisma/seed.ts` without aliases.

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const adapter = new PrismaPostgresAdapter({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const collegeResult = await prisma.college.createMany({
    data: colleges.map((college_name) => ({ college_name })),
    skipDuplicates: true,
  });
  console.log(`Colleges: ${collegeResult.count} inserted (${colleges.length} total).`);

  const eventResult = await prisma.event.createMany({
    data: events.map((e) => ({
      event_code: e.event_code,
      event_name: e.event_name,
      is_nandu: e.is_nandu,
      event_level: skillLevelByCode[e.event_level] ?? null,
      gender_category: genderByCode[e.gender_category] ?? null,
      event_category: eventCategoryFor(e),
      weapon_type: weaponTypeBySuffix[e.event_code.slice(-3)] ?? null,
    })),
    skipDuplicates: true,
  });
  console.log(`Events: ${eventResult.count} inserted (${events.length} total).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
