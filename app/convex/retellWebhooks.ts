"use node";

import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Retell from "retell-sdk";

export const retellWebhook = httpAction(async (ctx, request) => {
  const body = await request.text();
  const signature = request.headers.get("x-retell-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  const isValid = Retell.verify(
    body,
    process.env.RETELL_API_KEY!,
    signature,
  );

  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(body);
  const event = payload.event;
  const call = payload.call;

  const leadId = call?.metadata?.leadId;
  if (!leadId) {
    return new Response("OK", { status: 200 });
  }

  switch (event) {
    case "call_ended": {
      const disconnectReason = call.disconnection_reason;

      if (
        disconnectReason === "dial_no_answer" ||
        disconnectReason === "dial_busy" ||
        disconnectReason === "voicemail_reached"
      ) {
        await ctx.runMutation(internal.leads.updateStatusInternal, {
          leadId,
          status: "no_answer",
        });
      }
      break;
    }

    case "call_analyzed": {
      const summary = call.call_analysis?.call_summary;
      const sentiment = call.call_analysis?.user_sentiment;

      if (summary) {
        // Only update notes, don't override status if already booked
        const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
        if (lead && lead.status !== "booked") {
          const status =
            sentiment === "Negative" ? "not_interested" : "qualified";
          await ctx.runMutation(internal.leads.updateStatusInternal, {
            leadId,
            status,
            notes: summary,
          });
        }
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
});
