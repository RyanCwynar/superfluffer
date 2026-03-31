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

export async function POST(request: Request) {
  const body = await request.json();
  const { name, slug, industry, timezone, retellAgentId, retellPhoneNumber, calComEventSlug } =
    body as {
      name: string;
      slug: string;
      industry: string;
      timezone: string;
      retellAgentId: string;
      retellPhoneNumber: string;
      calComEventSlug?: string;
    };

  if (!name || !slug || !industry || !timezone) {
    return NextResponse.json(
      { error: "name, slug, industry, and timezone are required" },
      { status: 400 },
    );
  }

  const [client] = await db
    .insert(clients)
    .values({
      name,
      slug,
      industry,
      timezone,
      retellAgentId: retellAgentId || "",
      retellPhoneNumber: retellPhoneNumber || "",
      calComEventSlug: calComEventSlug || null,
      active: true,
    })
    .returning();

  return NextResponse.json(client);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, ...fields } = body as {
    id: number;
    name?: string;
    slug?: string;
    industry?: string;
    timezone?: string;
    retellAgentId?: string;
    retellPhoneNumber?: string;
    calComEventSlug?: string;
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
  if (fields.retellAgentId !== undefined) updates.retellAgentId = fields.retellAgentId;
  if (fields.retellPhoneNumber !== undefined) updates.retellPhoneNumber = fields.retellPhoneNumber;
  if (fields.calComEventSlug !== undefined) updates.calComEventSlug = fields.calComEventSlug;
  if (fields.active !== undefined) updates.active = fields.active;

  const [client] = await db
    .update(clients)
    .set(updates)
    .where(eq(clients.id, id))
    .returning();

  return NextResponse.json(client);
}
