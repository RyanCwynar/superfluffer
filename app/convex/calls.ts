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

    // Get the client config for this batch's client
    const firstLead = leads[0];
    const client = await ctx.runQuery(internal.clients.getInternal, {
      clientId: firstLead.clientId,
    });
    if (!client) {
      console.error(`Client not found for batch ${args.batchId}`);
      return;
    }

    const retell = getRetellClient();

    await ctx.runMutation(internal.batches.updateStatusInternal, {
      batchId: args.batchId,
      status: "calling",
    });

    for (const lead of leads) {
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
            leadId: lead._id,
            batchId: args.batchId,
            clientId: client._id,
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

    const client = await ctx.runQuery(internal.clients.getInternal, {
      clientId: lead.clientId,
    });
    if (!client) return;

    const retell = getRetellClient();

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
          leadId: lead._id,
          clientId: client._id,
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
