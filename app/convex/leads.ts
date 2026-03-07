import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const list = query({
  args: { batchId: v.optional(v.id("batches")) },
  handler: async (ctx, args) => {
    if (args.batchId) {
      return ctx.db
        .query("leads")
        .withIndex("by_batch", (q) => q.eq("batchId", args.batchId!))
        .collect();
    }
    return ctx.db.query("leads").collect();
  },
});

export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("leads")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
  },
});

export const listPending = internalQuery({
  args: { batchId: v.id("batches") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("leads")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

export const getInternal = internalQuery({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.leadId);
  },
});

export const getByRetellCallId = internalQuery({
  args: { retellCallId: v.string() },
  handler: async (ctx, args) => {
    // Linear scan is fine for MVP volume
    const leads = await ctx.db.query("leads").collect();
    return leads.find((l) => l.retellCallId === args.retellCallId) ?? null;
  },
});

export const updateStatusInternal = internalMutation({
  args: {
    leadId: v.id("leads"),
    status: v.union(
      v.literal("pending"),
      v.literal("calling"),
      v.literal("no_answer"),
      v.literal("qualified"),
      v.literal("booked"),
      v.literal("not_interested"),
      v.literal("unreachable"),
    ),
    retellCallId: v.optional(v.string()),
    notes: v.optional(v.string()),
    appointmentTime: v.optional(v.string()),
    calendarEventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { leadId, ...fields } = args;
    const updates: Record<string, unknown> = { status: fields.status };

    if (fields.retellCallId !== undefined) updates.retellCallId = fields.retellCallId;
    if (fields.notes !== undefined) updates.notes = fields.notes;
    if (fields.appointmentTime !== undefined) updates.appointmentTime = fields.appointmentTime;
    if (fields.calendarEventId !== undefined) updates.calendarEventId = fields.calendarEventId;

    if (fields.status === "calling") {
      const lead = await ctx.db.get(leadId);
      if (lead) {
        updates.callAttempts = lead.callAttempts + 1;
        updates.lastCallAt = Date.now();
      }
    }

    // Schedule retry if no_answer and under 3 attempts
    if (fields.status === "no_answer") {
      const lead = await ctx.db.get(leadId);
      if (lead && lead.callAttempts < 3) {
        const delay = lead.callAttempts === 1
          ? 2 * 60 * 60 * 1000  // 2 hours after first attempt
          : 24 * 60 * 60 * 1000; // next day after second attempt
        updates.nextRetryAt = Date.now() + delay;
        await ctx.scheduler.runAfter(delay, internal.calls.retryCall, {
          leadId,
        });
      } else {
        updates.status = "unreachable";
      }
    }

    await ctx.db.patch(leadId, updates);
  },
});

export const updateStatus = mutation({
  args: {
    leadId: v.id("leads"),
    status: v.union(
      v.literal("pending"),
      v.literal("calling"),
      v.literal("no_answer"),
      v.literal("qualified"),
      v.literal("booked"),
      v.literal("not_interested"),
      v.literal("unreachable"),
    ),
    retellCallId: v.optional(v.string()),
    notes: v.optional(v.string()),
    appointmentTime: v.optional(v.string()),
    calendarEventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { leadId, ...fields } = args;
    const updates: Record<string, unknown> = { status: fields.status };

    if (fields.retellCallId !== undefined) updates.retellCallId = fields.retellCallId;
    if (fields.notes !== undefined) updates.notes = fields.notes;
    if (fields.appointmentTime !== undefined) updates.appointmentTime = fields.appointmentTime;
    if (fields.calendarEventId !== undefined) updates.calendarEventId = fields.calendarEventId;

    if (fields.status === "calling") {
      const lead = await ctx.db.get(leadId);
      if (lead) {
        updates.callAttempts = lead.callAttempts + 1;
        updates.lastCallAt = Date.now();
      }
    }

    await ctx.db.patch(leadId, updates);
  },
});
