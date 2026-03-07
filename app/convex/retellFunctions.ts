"use node";

import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Retell from "retell-sdk";

export const bookAppointmentHandler = httpAction(async (ctx, request) => {
  const body = await request.text();
  const signature = request.headers.get("x-retell-signature");

  if (signature) {
    const isValid = Retell.verify(
      body,
      process.env.RETELL_API_KEY!,
      signature,
    );
    if (!isValid) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  const payload = JSON.parse(body);
  const { slot, date, leadName, leadPhone, notes } = payload.args;
  const leadId = payload.call?.metadata?.leadId;

  const result = await ctx.runAction(internal.calendar.bookAppointment, {
    slot,
    date,
    leadName: leadName || "Unknown",
    leadPhone: leadPhone || "",
    notes,
  });

  if (result.success && leadId) {
    await ctx.runMutation(internal.leads.updateStatusInternal, {
      leadId,
      status: "booked",
      appointmentTime: result.dateTime,
      calendarEventId: result.eventId,
    });
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
