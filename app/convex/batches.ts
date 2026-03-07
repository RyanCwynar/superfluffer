import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const list = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("batches")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    clientId: v.id("clients"),
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
      clientId: args.clientId,
    });

    for (const lead of args.leads) {
      await ctx.db.insert("leads", {
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        status: "pending",
        callAttempts: 0,
        batchId,
        clientId: args.clientId,
      });
    }

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
