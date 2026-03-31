import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { batches, leads, clients, calls } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getRetellClient } from "@/lib/retell";
import { normalizePhone } from "@/lib/phone";
import { isInCallWindow, getNextCallWindowStart } from "@/lib/schedule";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json(
      { error: "clientId required" },
      { status: 400 },
    );
  }

  const result = await db
    .select()
    .from(batches)
    .where(eq(batches.clientId, parseInt(clientId)))
    .orderBy(desc(batches.uploadedAt));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { clientId, fileName, leads: leadData } = body as {
    clientId: number;
    fileName: string;
    leads: { name: string; phone: string; email?: string }[];
  };

  const [batch] = await db
    .insert(batches)
    .values({
      fileName,
      totalLeads: leadData.length,
      status: "processing",
      clientId,
    })
    .returning();

  // Normalize phones and filter invalid
  const validLeads = leadData
    .map((l) => ({ ...l, phone: normalizePhone(l.phone) }))
    .filter((l): l is typeof l & { phone: string } => l.phone !== null);

  // Upsert each lead (update name/email/batch if phone already exists)
  const insertedLeads: (typeof leads.$inferSelect)[] = [];
  for (const l of validLeads) {
    const [lead] = await db
      .insert(leads)
      .values({
        name: l.name,
        phone: l.phone,
        email: l.email || null,
        status: "new",
        callAttempts: 0,
        batchId: batch.id,
        clientId,
      })
      .onConflictDoUpdate({
        target: [leads.phone, leads.clientId],
        set: {
          name: l.name,
          email: l.email || null,
          batchId: batch.id,
        },
      })
      .returning();
    insertedLeads.push(lead);
  }

  after(async () => {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId));
    if (!client) return;

    // Check call window — if outside, schedule for next window
    if (!isInCallWindow(client)) {
      const nextWindow = getNextCallWindowStart(client);
      for (const lead of insertedLeads) {
        await db
          .update(leads)
          .set({ status: "active", nextRetryAt: nextWindow })
          .where(eq(leads.id, lead.id));
      }
      await db
        .update(batches)
        .set({ status: "scheduled" })
        .where(eq(batches.id, batch.id));
      return;
    }

    if (!client.retellAgentId || !client.retellPhoneNumber) {
      console.error(`Client ${client.name} missing Retell agent or phone`);
      return;
    }

    const retell = await getRetellClient();
    const calComLink = client.calComEventSlug
      ? `https://cal.com/${client.slug}/${client.calComEventSlug}`
      : "";

    await db
      .update(batches)
      .set({ status: "calling" })
      .where(eq(batches.id, batch.id));

    for (const lead of insertedLeads) {
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
            batchId: String(batch.id),
            clientId: String(client.id),
          },
        });

        // Create call record
        await db.insert(calls).values({
          leadId: lead.id,
          clientId,
          retellCallId: call.call_id,
          status: "initiated",
          attemptNumber: 1,
          calledAt: new Date(),
        });

        // Update lead
        await db
          .update(leads)
          .set({
            status: "active",
            callAttempts: 1,
          })
          .where(eq(leads.id, lead.id));
      } catch (error) {
        console.error(`Failed to call ${lead.phone}:`, error);
      }
    }
  });

  return NextResponse.json(batch);
}
