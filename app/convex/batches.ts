import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const list = query({
  handler: async (ctx) => {
    return ctx.db.query("batches").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    fileName: v.string(),
    leads: v.array(
      v.object({
        name: v.string(),
        phone: v.string(),
        email: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const batchId = await ctx.db.insert("batches", {
      fileName: args.fileName,
      uploadedAt: Date.now(),
      totalLeads: args.leads.length,
      status: "processing",
    });

    for (const lead of args.leads) {
      await ctx.db.insert("leads", {
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        status: "pending",
        callAttempts: 0,
        batchId,
      });
    }

    // Kick off the batch calling
    await ctx.scheduler.runAfter(0, internal.calls.triggerBatch, { batchId });

    return batchId;
  },
});

export const updateStatus = mutation({
  args: {
    batchId: v.id("batches"),
    status: v.union(
      v.literal("processing"),
      v.literal("calling"),
      v.literal("completed"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.batchId, { status: args.status });
  },
});

export const updateStatusInternal = internalMutation({
  args: {
    batchId: v.id("batches"),
    status: v.union(
      v.literal("processing"),
      v.literal("calling"),
      v.literal("completed"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.batchId, { status: args.status });
  },
});
