import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function POST(request: Request) {
  const { key } = (await request.json()) as { key: string };

  if (!key) {
    return NextResponse.json({ error: "Key required" }, { status: 400 });
  }

  const hashed = hashKey(key);

  const [match] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.hashedKey, hashed));

  if (!match) {
    return NextResponse.json({ error: "Invalid key" }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    name: match.name,
    role: match.role,
  });

  response.cookies.set("sf_session", `${match.id}:${hashed}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}
