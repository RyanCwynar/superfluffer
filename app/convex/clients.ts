import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return ctx.db
      .query("clients")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
  },
});

export const get = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.clientId);
  },
});

export const getInternal = internalQuery({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.clientId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    industry: v.string(),
    timezone: v.string(),
    retellAgentId: v.string(),
    retellPhoneNumber: v.string(),
    calComEventSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("clients", { ...args, active: true });
  },
});

export const update = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.optional(v.string()),
    retellAgentId: v.optional(v.string()),
    retellPhoneNumber: v.optional(v.string()),
    calComEventSlug: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { clientId, ...fields } = args;
    const updates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) updates[key] = val;
    }
    await ctx.db.patch(clientId, updates);
  },
});
