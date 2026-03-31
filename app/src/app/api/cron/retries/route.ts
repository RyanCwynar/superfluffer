import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, clients, calls } from "@/lib/db/schema";
import { eq, lte, and } from "drizzle-orm";
import { getRetellClient } from "@/lib/retell";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const retryLeads = await db
    .select()
    .from(leads)
    .where(
      and(eq(leads.status, "active"), lte(leads.nextRetryAt, new Date())),
    );

  if (retryLeads.length === 0) {
    return NextResponse.json({ retried: 0 });
  }

  const retell = getRetellClient();
  let retried = 0;

  for (const lead of retryLeads) {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, lead.clientId));
    if (!client) continue;

    try {
      const call = await retell.call.createPhoneCall({
        from_number: client.retellPhoneNumber,
        to_number: lead.phone,
        override_agent_id: client.retellAgentId,
        retell_llm_dynamic_variables: {
          lead_name: lead.name,
          lead_phone: lead.phone,
        },
        metadata: {
          leadId: String(lead.id),
          clientId: String(client.id),
        },
      });

      const newAttempt = lead.callAttempts + 1;

      // Create call record
      await db.insert(calls).values({
        leadId: lead.id,
        clientId: lead.clientId,
        retellCallId: call.call_id,
        status: "initiated",
        attemptNumber: newAttempt,
        calledAt: new Date(),
      });

      // Update lead
      await db
        .update(leads)
        .set({
          status: "active",
          callAttempts: newAttempt,
          nextRetryAt: null,
        })
        .where(eq(leads.id, lead.id));

      retried++;
    } catch (error) {
      console.error(`Retry failed for ${lead.phone}:`, error);
    }
  }

  return NextResponse.json({ retried });
}
