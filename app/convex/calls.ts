"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Retell from "retell-sdk";

function getRetellClient() {
  return new Retell({ apiKey: process.env.RETELL_API_KEY! });
}

export const triggerBatch = internalAction({
  args: { batchId: v.id("batches") },
  handler: async (ctx, args) => {
    const leads = await ctx.runQuery(internal.leads.listPending, {
      batchId: args.batchId,
    });

    if (leads.length === 0) {
      await ctx.runMutation(internal.batches.updateStatusInternal, {
        batchId: args.batchId,
        status: "completed",
      });
      return;
    }

    // Pre-fetch calendar availability once for the entire batch
    const availableSlots = await ctx.runAction(
      internal.calendar.getAvailableSlots,
      { days: 3 },
    );

    const slotsString = Object.entries(availableSlots)
      .map(([date, slots]) => `${date}: ${slots.join(", ")}`)
      .join("\n");

    const retell = getRetellClient();

    await ctx.runMutation(internal.batches.updateStatusInternal, {
      batchId: args.batchId,
      status: "calling",
    });

    for (const lead of leads) {
      try {
        const call = await retell.call.createPhoneCall({
          from_number: process.env.RETELL_PHONE_NUMBER!,
          to_number: lead.phone,
          override_agent_id: process.env.RETELL_AGENT_ID,
          retell_llm_dynamic_variables: {
            lead_name: lead.name,
            lead_phone: lead.phone,
            available_slots: slotsString,
          },
          metadata: {
            leadId: lead._id,
            batchId: args.batchId,
          },
        });

        await ctx.runMutation(internal.leads.updateStatusInternal, {
          leadId: lead._id,
          status: "calling",
          retellCallId: call.call_id,
        });
      } catch (error) {
        console.error(`Failed to call ${lead.phone}:`, error);
      }
    }
  },
});

export const retryCall = internalAction({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    const lead = await ctx.runQuery(internal.leads.getInternal, {
      leadId: args.leadId,
    });
    if (!lead || lead.status === "booked" || lead.status === "unreachable") {
      return;
    }

    // Re-fetch fresh availability for retry
    const availableSlots = await ctx.runAction(
      internal.calendar.getAvailableSlots,
      { days: 3 },
    );

    const slotsString = Object.entries(availableSlots)
      .map(([date, slots]) => `${date}: ${slots.join(", ")}`)
      .join("\n");

    const retell = getRetellClient();

    try {
      const call = await retell.call.createPhoneCall({
        from_number: process.env.RETELL_PHONE_NUMBER!,
        to_number: lead.phone,
        override_agent_id: process.env.RETELL_AGENT_ID,
        retell_llm_dynamic_variables: {
          lead_name: lead.name,
          lead_phone: lead.phone,
          available_slots: slotsString,
        },
        metadata: {
          leadId: lead._id,
        },
      });

      await ctx.runMutation(internal.leads.updateStatusInternal, {
        leadId: args.leadId,
        status: "calling",
        retellCallId: call.call_id,
      });
    } catch (error) {
      console.error(`Retry failed for ${lead.phone}:`, error);
    }
  },
});
