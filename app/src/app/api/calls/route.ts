import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calls } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");

  if (!leadId) {
    return NextResponse.json({ error: "leadId required" }, { status: 400 });
  }

  const result = await db
    .select()
    .from(calls)
    .where(eq(calls.leadId, parseInt(leadId)))
    .orderBy(calls.attemptNumber);

  return NextResponse.json(result);
}
