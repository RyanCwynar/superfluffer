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

export async function POST(request: Request) {
  const body = await request.json();
  const { clientId, name, phone, email } = body as {
    clientId: number;
    name: string;
    phone: string;
    email?: string;
  };

  if (!clientId || !name || !phone) {
    return NextResponse.json(
      { error: "clientId, name, and phone are required" },
      { status: 400 },
    );
  }

  const [lead] = await db
    .insert(leads)
    .values({
      name,
      phone,
      email: email || null,
      status: "new",
      callAttempts: 0,
      clientId,
    })
    .returning();

  return NextResponse.json(lead);
}
