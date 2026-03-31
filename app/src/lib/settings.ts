import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get a setting value. Checks DB first, falls back to env var.
 */
export async function getSetting(key: string): Promise<string | undefined> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key));

  if (row) return row.value;

  return process.env[key];
}

/**
 * Get a required setting. Throws if not found.
 */
export async function getRequiredSetting(key: string): Promise<string> {
  const value = await getSetting(key);
  if (!value) throw new Error(`Setting ${key} is required but not configured`);
  return value;
}
