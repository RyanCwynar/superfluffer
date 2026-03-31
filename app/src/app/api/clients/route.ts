import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { provisionRetellAgent } from "@/lib/retell";

export async function GET() {
  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.active, true));
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, slug, industry, timezone, areaCode } = body as {
    name: string;
    slug: string;
    industry: string;
    timezone: string;
    areaCode?: number;
  };

  if (!name || !slug || !industry || !timezone) {
    return NextResponse.json(
      { error: "name, slug, industry, and timezone are required" },
      { status: 400 },
    );
  }

  // Auto-provision Retell agent + phone number
  let retellAgentId: string | null = null;
  let retellLlmId: string | null = null;
  let retellPhoneNumber: string | null = null;
  let provisionError: string | null = null;

  try {
    const result = await provisionRetellAgent({
      name,
      areaCode: areaCode || undefined,
    });
    retellAgentId = result.agentId;
    retellLlmId = result.llmId;
    retellPhoneNumber = result.phoneNumber;
  } catch (err) {
    console.error("Failed to provision Retell agent:", err);
    provisionError = String(err);
  }

  const [client] = await db
    .insert(clients)
    .values({
      name,
      slug,
      industry,
      timezone,
      retellAgentId,
      retellLlmId,
      retellPhoneNumber,
      active: true,
    })
    .returning();

  return NextResponse.json({ ...client, provisionError });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, ...fields } = body as {
    id: number;
    name?: string;
    slug?: string;
    industry?: string;
    timezone?: string;
    active?: boolean;
  };

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (fields.name !== undefined) updates.name = fields.name;
  if (fields.slug !== undefined) updates.slug = fields.slug;
  if (fields.industry !== undefined) updates.industry = fields.industry;
  if (fields.timezone !== undefined) updates.timezone = fields.timezone;
  if (fields.active !== undefined) updates.active = fields.active;

  const [client] = await db
    .update(clients)
    .set(updates)
    .where(eq(clients.id, id))
    .returning();

  return NextResponse.json(client);
}
