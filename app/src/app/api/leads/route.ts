import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json(
      { error: "clientId required" },
      { status: 400 },
    );
  }

  const batchId = searchParams.get("batchId");
  const conditions = [eq(leads.clientId, parseInt(clientId))];
  if (batchId) conditions.push(eq(leads.batchId, parseInt(batchId)));

  const result = await db
    .select()
    .from(leads)
    .where(and(...conditions));

  return NextResponse.json(result);
}
