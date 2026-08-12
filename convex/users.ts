import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get user by email address
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
  },
});

/**
 * Get user by document ID
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * List users by role (admin panel)
 */
export const listUsersByRole = query({
  args: {
    role: v.union(
      v.literal("customer"),
      v.literal("pharmacist"),
      v.literal("admin")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();
  },
});

/**
 * Update profile details (name, phone, imageUrl)
 */
export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found.");
    }

    await ctx.db.patch(args.userId, {
      ...(args.name !== undefined && { name: args.name.trim() }),
      ...(args.phone !== undefined && { phone: args.phone.trim() }),
      ...(args.imageUrl !== undefined && { imageUrl: args.imageUrl }),
    });

    return await ctx.db.get(args.userId);
  },
});
