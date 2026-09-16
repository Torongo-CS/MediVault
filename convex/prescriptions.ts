import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Query: Fetch prescription documents uploaded by a specific user.
 */
export const listByUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("prescriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

/**
 * Mutation: Save a new uploaded prescription record.
 */
export const upload = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("prescriptions", {
      userId: args.userId,
      name: args.name.trim(),
      imageUrl: args.imageUrl,
      dateUploaded: Date.now(),
    });
  },
});

/**
 * Action / Mutation: Generate Convex storage URL for uploading prescription files.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
