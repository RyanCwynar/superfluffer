import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, calls } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getRetellClient } from "@/lib/retell";
import { getSetting } from "@/lib/settings";
import { verify as retellVerify } from "retell-sdk";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-retell-signature");

  if (!signature) {
    console.error("[webhook] Missing x-retell-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const apiKey = await getSetting("RETELL_API_KEY");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  let isValid = false;
  try {
    isValid = await retellVerify(body, apiKey, signature);
  } catch (err) {
    console.error("[webhook] Signature verification error:", err);
  }

  if (!isValid) {
    console.error("[webhook] Invalid signature");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 },
    );
  }

  console.log("[webhook] Signature valid, processing event");

  const payload = JSON.parse(body);
  const event = payload.event;
  const call = payload.call;

  const leadId = call?.metadata?.leadId;
  if (!leadId) {
    return NextResponse.json({ ok: true });
  }

  const id = parseInt(leadId);
  const retellCallId = call.call_id;

  switch (event) {
    case "call_ended": {
      // Fetch transcript from Retell
      let transcript: string | null = null;
      if (retellCallId) {
        try {
          const retell = await getRetellClient();
          const callDetail = await retell.call.retrieve(retellCallId);
          if (callDetail.transcript) {
            transcript = callDetail.transcript;
          }
        } catch (err) {
          console.error(`Failed to fetch transcript for ${retellCallId}:`, err);
        }
      }

      const reason = call.disconnection_reason;
      const callStatus =
        reason === "dial_no_answer" || reason === "dial_busy" || reason === "voicemail_reached"
          ? reason === "dial_no_answer" ? "no_answer"
          : reason === "dial_busy" ? "busy"
          : "voicemail"
          : "completed";

      // Update the call record
      if (retellCallId) {
        await db
          .update(calls)
          .set({
            status: callStatus,
            transcript,
            disconnectionReason: reason,
            duration: call.duration_ms ? Math.round(call.duration_ms / 1000) : null,
          })
          .where(eq(calls.retellCallId, retellCallId));
      }

      // Handle retry logic on lead
      if (callStatus === "no_answer" || callStatus === "busy" || callStatus === "voicemail") {
        const [lead] = await db
          .select()
          .from(leads)
          .where(eq(leads.id, id));

        if (lead && lead.callAttempts < 5) {
          const retryDelays: Record<number, number> = {
            1: 2 * 60 * 60 * 1000,
            2: 6 * 60 * 60 * 1000,
            3: 24 * 60 * 60 * 1000,
            4: 48 * 60 * 60 * 1000,
          };
          const delayMs = retryDelays[lead.callAttempts] ?? 72 * 60 * 60 * 1000;
          await db
            .update(leads)
            .set({
              status: "active",
              nextRetryAt: new Date(Date.now() + delayMs),
            })
            .where(eq(leads.id, id));
        } else {
          await db
            .update(leads)
            .set({ status: "failed" })
            .where(eq(leads.id, id));
        }
      }
      break;
    }

    case "call_analyzed": {
      const summary = call.call_analysis?.call_summary;
      const sentiment = call.call_analysis?.user_sentiment;

      // Update the call record with summary
      if (retellCallId && summary) {
        await db
          .update(calls)
          .set({ summary })
          .where(eq(calls.retellCallId, retellCallId));
      }

      // Update lead status
      if (summary) {
        const [lead] = await db
          .select()
          .from(leads)
          .where(eq(leads.id, id));

        if (lead && lead.status !== "scheduled") {
          const isBooked =
            summary?.toLowerCase().includes("appointment booked") ||
            summary?.toLowerCase().includes("scheduled") ||
            call.call_analysis?.custom_analysis_data?.booking_status === "booked";

          const status = isBooked
            ? "scheduled"
            : sentiment === "Negative"
              ? "failed"
              : "active";

          await db
            .update(leads)
            .set({ status })
            .where(eq(leads.id, id));
        }
      }
      break;
    }

    case "call_transcript_updated": {
      // Live transcript update during or after a call
      const transcript = call.transcript;
      if (retellCallId && transcript) {
        await db
          .update(calls)
          .set({ transcript })
          .where(eq(calls.retellCallId, retellCallId));
      }
      break;
    }
  }

  console.log(`[webhook] Processed ${event} for lead ${id}`);
  return NextResponse.json({ ok: true });
}
