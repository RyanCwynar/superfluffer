import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

async function verifyRetellSignature(
  body: string,
  apiKey: string,
  signature: string,
): Promise<boolean> {
  const match = signature.match(/v=(\d+),d=(.*)/);
  if (!match) return false;

  const timestamp = match[1];
  const digest = match[2];

  // Reject if older than 5 minutes
  const now = Date.now();
  if (Math.abs(now - parseInt(timestamp)) > 5 * 60 * 1000) return false;

  // HMAC-SHA256 of body + timestamp
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body + timestamp),
  );

  const computed = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === digest;
}

export const retellWebhook = httpAction(async (ctx, request) => {
  const body = await request.text();
  const signature = request.headers.get("x-retell-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    return new Response("Server misconfigured", { status: 500 });
  }

  const isValid = await verifyRetellSignature(body, apiKey, signature);
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
