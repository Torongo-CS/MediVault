import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Query: Fetch notifications for a specific user ID.
 * Returns notifications sorted newest first.
 */
export const getByUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_receiver", (q) => q.eq("receiverId", args.userId))
      .order("desc")
      .collect();

    return notifications;
  },
});

/**
 * Mutation: Mark a single notification as read.
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

/**
 * Mutation: Mark all notifications for a user as read.
 */
export const markAllAsRead = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_receiver", (q) => q.eq("receiverId", args.userId))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    for (const notif of notifications) {
      await ctx.db.patch(notif._id, { isRead: true });
    }
  },
});

/**
 * Helper Mutation: Create a notification.
 */
export const sendNotification = mutation({
  args: {
    senderId: v.id("users"),
    receiverId: v.id("users"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      senderId: args.senderId,
      receiverId: args.receiverId,
      message: args.message,
      isRead: false,
      timestamp: Date.now(),
    });
  },
});
