import { prisma } from "../src/lib/db";
import { seedDemo } from "../src/lib/demo/seed";

seedDemo()
  .then((result) => {
    console.log(`Seeded demo episode ${result.episodeId}`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
