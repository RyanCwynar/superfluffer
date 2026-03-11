import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.active, true));
  return NextResponse.json(result);
}
