/**
 * Seed the settings table with current environment variable values.
 *
 * Usage:
 *   cd app && export $(grep -v '^#' .env | xargs) && NODE_PATH=./node_modules npx tsx ../scripts/seed-settings.ts
 */
import postgres from "postgres";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const SETTINGS = [
  { key: "RETELL_API_KEY", label: "Retell API Key", category: "retell", sensitive: true },
  { key: "RETELL_WEBHOOK_SECRET", label: "Retell Webhook Secret", category: "retell", sensitive: true },
  { key: "CRON_SECRET", label: "Cron Secret", category: "system", sensitive: true },
  { key: "CAL_COM_API_KEY", label: "Cal.com API Key", category: "calendar", sensitive: true },
];

async function main() {
  const sql = postgres(dbUrl!);

  for (const setting of SETTINGS) {
    const envValue = process.env[setting.key];

    // Check if already exists
    const existing = await sql`
      SELECT id FROM settings WHERE key = ${setting.key}
    `;

    if (existing.length > 0) {
      console.log(`  [skip] ${setting.key} already exists`);
      continue;
    }

    const value = envValue || "";
    await sql`
      INSERT INTO settings (key, value, label, category, sensitive)
      VALUES (${setting.key}, ${value}, ${setting.label}, ${setting.category}, ${setting.sensitive})
    `;
    console.log(`  [seed] ${setting.key} = ${envValue ? "(from env)" : "(empty)"}`);
  }

  console.log("\nDone.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
