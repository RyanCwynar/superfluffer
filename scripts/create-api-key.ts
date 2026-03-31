/**
 * Create an API key for SuperFluffer admin access.
 *
 * Usage:
 *   cd app && npx tsx ../scripts/create-api-key.ts "Ryan" admin
 *
 * Prints the plaintext key — save it, it won't be shown again.
 */
import { createHash, randomBytes } from "crypto";
import postgres from "postgres";

const name = process.argv[2];
const role = process.argv[3] || "admin";

if (!name) {
  console.error("Usage: npx tsx ../scripts/create-api-key.ts <name> [role]");
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const plainKey = `sf_${randomBytes(24).toString("hex")}`;
const hashedKey = createHash("sha256").update(plainKey).digest("hex");

const sql = postgres(dbUrl);

await sql`
  INSERT INTO api_keys (name, role, hashed_key)
  VALUES (${name}, ${role}, ${hashedKey})
`;

console.log(`\nAPI key created for "${name}" (role: ${role})`);
console.log(`\nKey: ${plainKey}\n`);
console.log("Save this key — it will not be shown again.");

await sql.end();
