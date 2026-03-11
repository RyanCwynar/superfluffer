import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyRetellSignature } from "@/lib/retell";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-retell-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const isValid = await verifyRetellSignature(body, apiKey, signature);
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 },
    );
  }

  const payload = JSON.parse(body);
  const event = payload.event;
  const call = payload.call;

  const leadId = call?.metadata?.leadId;
  if (!leadId) {
    return NextResponse.json({ ok: true });
  }

  const id = parseInt(leadId);

  switch (event) {
    case "call_ended": {
      const reason = call.disconnection_reason;
      if (
        reason === "dial_no_answer" ||
        reason === "dial_busy" ||
        reason === "voicemail_reached"
      ) {
        const [lead] = await db
          .select()
          .from(leads)
          .where(eq(leads.id, id));

        if (lead && lead.callAttempts < 3) {
          const delayMs =
            lead.callAttempts === 1
              ? 2 * 60 * 60 * 1000 // 2 hours
              : 24 * 60 * 60 * 1000; // 24 hours
          await db
            .update(leads)
            .set({
              status: "no_answer",
              nextRetryAt: new Date(Date.now() + delayMs),
            })
            .where(eq(leads.id, id));
        } else {
          await db
            .update(leads)
            .set({ status: "unreachable" })
            .where(eq(leads.id, id));
        }
      }
      break;
    }

    case "call_analyzed": {
      const summary = call.call_analysis?.call_summary;
      const sentiment = call.call_analysis?.user_sentiment;

      if (summary) {
        const [lead] = await db
          .select()
          .from(leads)
          .where(eq(leads.id, id));

        if (lead && lead.status !== "booked") {
          const status =
            sentiment === "Negative" ? "not_interested" : "qualified";
          await db
            .update(leads)
            .set({ status, notes: summary })
            .where(eq(leads.id, id));
        }
      }
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
