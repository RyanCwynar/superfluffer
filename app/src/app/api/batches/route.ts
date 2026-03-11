import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { batches, leads, clients } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getRetellClient } from "@/lib/retell";

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

  const insertedLeads = await db
    .insert(leads)
    .values(
      leadData.map((l) => ({
        name: l.name,
        phone: l.phone,
        email: l.email || null,
        status: "pending",
        callAttempts: 0,
        batchId: batch.id,
        clientId,
      })),
    )
    .returning();

  after(async () => {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId));
    if (!client) return;

    const retell = getRetellClient();

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
          },
          metadata: {
            leadId: String(lead.id),
            batchId: String(batch.id),
            clientId: String(client.id),
          },
        });

        await db
          .update(leads)
          .set({
            status: "calling",
            callAttempts: 1,
            lastCallAt: new Date(),
            retellCallId: call.call_id,
          })
          .where(eq(leads.id, lead.id));
      } catch (error) {
        console.error(`Failed to call ${lead.phone}:`, error);
      }
    }
  });

  return NextResponse.json(batch);
}
