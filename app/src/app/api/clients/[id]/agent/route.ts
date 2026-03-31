import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { provisionRetellAgent, syncRetellAgent } from "@/lib/retell";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, parseInt(id)));

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({
    agentPrompt: client.agentPrompt,
    agentVoiceId: client.agentVoiceId,
    agentWelcomeMessage: client.agentWelcomeMessage,
    retellAgentId: client.retellAgentId,
    retellLlmId: client.retellLlmId,
    retellPhoneNumber: client.retellPhoneNumber,
    calComApiKey: client.calComApiKey ? "••••configured" : null,
    calComEventSlug: client.calComEventSlug,
    calComEventTypeId: client.calComEventTypeId,
    callWindowStart: client.callWindowStart,
    callWindowEnd: client.callWindowEnd,
    callDays: client.callDays,
  });
}

/**
 * POST: Provision a new Retell agent + phone number for this client.
 * Used when the client has no agent or has a placeholder.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, parseInt(id)));

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  try {
    const result = await provisionRetellAgent({
      name: client.name,
      prompt: client.agentPrompt ?? undefined,
      welcomeMessage: client.agentWelcomeMessage ?? undefined,
      voiceId: client.agentVoiceId ?? undefined,
      areaCode: body.areaCode || undefined,
    });

    await db
      .update(clients)
      .set({
        retellAgentId: result.agentId,
        retellLlmId: result.llmId,
        retellPhoneNumber: result.phoneNumber,
      })
      .where(eq(clients.id, parseInt(id)));

    return NextResponse.json({
      ok: true,
      agentId: result.agentId,
      llmId: result.llmId,
      phoneNumber: result.phoneNumber,
    });
  } catch (err) {
    console.error("Failed to provision Retell agent:", err);
    return NextResponse.json(
      { error: `Provisioning failed: ${err}` },
      { status: 500 },
    );
  }
}

/**
 * PUT: Update agent config fields + sync to Retell.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, parseInt(id)));

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Build update fields
  const updates: Record<string, unknown> = {};
  const fields = [
    "agentPrompt", "agentVoiceId", "agentWelcomeMessage",
    "calComApiKey", "calComEventSlug", "calComEventTypeId",
    "callWindowStart", "callWindowEnd", "callDays",
  ] as const;

  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  // Save to DB first
  if (Object.keys(updates).length > 0) {
    await db.update(clients).set(updates).where(eq(clients.id, parseInt(id)));
  }

  // Sync to Retell if agent exists
  const prompt = body.agentPrompt ?? client.agentPrompt;
  if (prompt && client.retellAgentId && client.retellLlmId) {
    try {
      await syncRetellAgent({
        agentId: client.retellAgentId,
        llmId: client.retellLlmId,
        name: client.name,
        prompt,
        welcomeMessage: body.agentWelcomeMessage ?? client.agentWelcomeMessage ?? undefined,
        voiceId: body.agentVoiceId ?? client.agentVoiceId ?? undefined,
      });
    } catch (err) {
      console.error("Failed to sync to Retell:", err);
      return NextResponse.json(
        { ok: true, retellSync: false, error: String(err) },
        { status: 200 },
      );
    }
  }

  return NextResponse.json({ ok: true, retellSync: !!client.retellAgentId });
}
