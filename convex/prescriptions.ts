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
    fileName: v.optional(v.string()),
    fileType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("prescriptions", {
      userId: args.userId,
      name: args.name.trim(),
      imageUrl: args.imageUrl,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      notes: args.notes ? args.notes.trim() : undefined,
      dateUploaded: Date.now(),
    });
  },
});

/**
 * Mutation: Remove a prescription belonging to the user.
 */
export const remove = mutation({
  args: {
    id: v.id("prescriptions"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const rx = await ctx.db.get(args.id);
    if (!rx) return false;
    if (rx.userId !== args.userId) {
      throw new Error("Unauthorized to delete this prescription");
    }
    await ctx.db.delete(args.id);
    return true;
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
