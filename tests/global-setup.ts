import { execSync } from "node:child_process";

const TEST_DB = "file:./test.db";

export default function setup() {
  process.env.DATABASE_URL = TEST_DB;
  process.env.DEMO_MODE = "true";
  delete process.env.OPENAI_API_KEY;
  execSync("npx prisma db push --skip-generate --force-reset", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DB },
  });
}
