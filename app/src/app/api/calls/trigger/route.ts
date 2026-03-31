import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, clients, calls } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getRetellClient } from "@/lib/retell";

export async function POST(request: Request) {
  const { leadId } = (await request.json()) as { leadId: number };

  if (!leadId) {
    return NextResponse.json({ error: "leadId required" }, { status: 400 });
  }

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const [client] = await db.select().from(clients).where(eq(clients.id, lead.clientId));
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (!client.retellAgentId || !client.retellPhoneNumber) {
    return NextResponse.json(
      { error: "Client missing Retell agent or phone number" },
      { status: 400 },
    );
  }

  const retell = await getRetellClient();
  const calComLink = client.calComEventSlug
    ? `https://cal.com/${client.slug}/${client.calComEventSlug}`
    : "";

  const newAttempt = lead.callAttempts + 1;

  try {
    const call = await retell.call.createPhoneCall({
      from_number: client.retellPhoneNumber,
      to_number: lead.phone,
      override_agent_id: client.retellAgentId,
      retell_llm_dynamic_variables: {
        lead_name: lead.name,
        lead_phone: lead.phone,
        cal_com_link: calComLink,
      },
      metadata: {
        leadId: String(lead.id),
        clientId: String(client.id),
      },
    });

    await db.insert(calls).values({
      leadId: lead.id,
      clientId: lead.clientId,
      retellCallId: call.call_id,
      status: "initiated",
      attemptNumber: newAttempt,
      calledAt: new Date(),
    });

    await db
      .update(leads)
      .set({
        status: "active",
        callAttempts: newAttempt,
        nextRetryAt: null,
      })
      .where(eq(leads.id, lead.id));

    return NextResponse.json({ ok: true, callId: call.call_id, attempt: newAttempt });
  } catch (err) {
    console.error(`Manual call failed for ${lead.phone}:`, err);
    return NextResponse.json(
      { error: `Call failed: ${err}` },
      { status: 500 },
    );
  }
}
