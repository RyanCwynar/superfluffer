import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  leads: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    source: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("calling"),
      v.literal("no_answer"),
      v.literal("qualified"),
      v.literal("booked"),
      v.literal("not_interested"),
      v.literal("unreachable"),
    ),
    callAttempts: v.number(),
    lastCallAt: v.optional(v.number()),
    nextRetryAt: v.optional(v.number()),
    retellCallId: v.optional(v.string()),
    appointmentTime: v.optional(v.string()),
    calendarEventId: v.optional(v.string()),
    notes: v.optional(v.string()),
    batchId: v.id("batches"),
  })
    .index("by_status", ["status"])
    .index("by_phone", ["phone"])
    .index("by_batch", ["batchId"]),

  batches: defineTable({
    fileName: v.string(),
    uploadedAt: v.number(),
    totalLeads: v.number(),
    status: v.union(
      v.literal("processing"),
      v.literal("calling"),
      v.literal("completed"),
    ),
  }),
});
