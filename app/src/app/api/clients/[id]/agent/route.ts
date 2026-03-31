import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createRetellAgent, syncRetellAgent } from "@/lib/retell";

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
    "retellPhoneNumber",
  ] as const;

  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  // Save to DB first
  if (Object.keys(updates).length > 0) {
    await db.update(clients).set(updates).where(eq(clients.id, parseInt(id)));
  }

  // Sync to Retell if we have prompt changes
  const prompt = body.agentPrompt ?? client.agentPrompt;
  if (prompt) {
    try {
      if (client.retellAgentId && client.retellLlmId) {
        // Update existing agent
        await syncRetellAgent({
          agentId: client.retellAgentId,
          llmId: client.retellLlmId,
          name: client.name,
          prompt,
          welcomeMessage: body.agentWelcomeMessage ?? client.agentWelcomeMessage ?? undefined,
          voiceId: body.agentVoiceId ?? client.agentVoiceId ?? undefined,
        });
      } else {
        // Create new agent
        const { agentId, llmId } = await createRetellAgent({
          name: client.name,
          prompt,
          welcomeMessage: body.agentWelcomeMessage ?? client.agentWelcomeMessage ?? undefined,
          voiceId: body.agentVoiceId ?? client.agentVoiceId ?? undefined,
        });

        await db
          .update(clients)
          .set({ retellAgentId: agentId, retellLlmId: llmId })
          .where(eq(clients.id, parseInt(id)));
      }
    } catch (err) {
      console.error("Failed to sync to Retell:", err);
      return NextResponse.json(
        { ok: true, retellSync: false, error: String(err) },
        { status: 200 },
      );
    }
  }

  return NextResponse.json({ ok: true, retellSync: true });
}
