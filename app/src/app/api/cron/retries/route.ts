import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, clients, calls } from "@/lib/db/schema";
import { eq, lte, and } from "drizzle-orm";
import { getRetellClient } from "@/lib/retell";
import { getSetting } from "@/lib/settings";
import { isInCallWindow, getNextCallWindowStart } from "@/lib/schedule";

export async function GET(request: Request) {
  const cronSecret = await getSetting("CRON_SECRET");
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
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

  const retell = await getRetellClient();
  let retried = 0;
  let deferred = 0;

  for (const lead of retryLeads) {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, lead.clientId));
    if (!client) continue;

    // Check call window
    if (!isInCallWindow(client)) {
      const nextWindow = getNextCallWindowStart(client);
      await db
        .update(leads)
        .set({ nextRetryAt: nextWindow })
        .where(eq(leads.id, lead.id));
      deferred++;
      continue;
    }

    if (!client.retellAgentId || !client.retellPhoneNumber) continue;

    const calComLink = client.calComEventSlug
      ? `https://cal.com/${client.slug}/${client.calComEventSlug}`
      : "";

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

      const newAttempt = lead.callAttempts + 1;

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

      retried++;
    } catch (error) {
      console.error(`Retry failed for ${lead.phone}:`, error);
    }
  }

  return NextResponse.json({ retried, deferred });
}
