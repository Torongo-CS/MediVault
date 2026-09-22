import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Helper to get clean, professional display names.
 * For Pharmacists: Always returns the Pharmacy Shop Name (e.g. "HealthPlus Pharmacy").
 * For Admins: "MediVault Support (Admin)".
 * For Customers: Customer Name or Email.
 */
function getDisplayName(user: { role: string; shopName?: string; name?: string; email: string }) {
  if (user.role === "pharmacist" && user.shopName && user.shopName.trim()) {
    return user.shopName.trim();
  }
  if (user.role === "admin") {
    return "MediVault Support (Admin)";
  }
  return user.name?.trim() || user.email.split("@")[0];
}

/**
 * List registered user accounts that the current user is permitted to chat with.
 * RESTRICTIONS ENFORCED:
 * - Admin CANNOT message Admin
 * - Customer CANNOT message Customer
 * - Pharmacist CANNOT message Pharmacist
 */
export const listChattableAccounts = query({
  args: {
    userId: v.optional(v.id("users")),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let currentUser = null;
    if (args.userId) {
      currentUser = await ctx.db.get(args.userId);
    }

    const currentRole = currentUser?.role ?? "customer";
    const currentId = currentUser?._id;
    const allUsers = await ctx.db.query("users").collect();

    // Filter out same-role users and self
    let filteredUsers = allUsers.filter((u) => {
      if (currentId && u._id === currentId) return false; // cannot chat with self
      if (u.role === currentRole) return false;          // cannot chat with same role
      return true;
    });

    if (args.searchQuery && args.searchQuery.trim()) {
      const q = args.searchQuery.trim().toLowerCase();
      filteredUsers = filteredUsers.filter((u) => {
        const displayName = getDisplayName(u).toLowerCase();
        const nameMatch = u.name ? u.name.toLowerCase().includes(q) : false;
        const emailMatch = u.email.toLowerCase().includes(q);
        const shopMatch = u.shopName ? u.shopName.toLowerCase().includes(q) : false;
        const roleMatch = u.role.toLowerCase().includes(q);
        const displayMatch = displayName.includes(q);
        return nameMatch || emailMatch || shopMatch || roleMatch || displayMatch;
      });
    }

    return filteredUsers.map((u) => ({
      _id: u._id,
      displayName: getDisplayName(u),
      name: u.name ?? u.email.split("@")[0],
      email: u.email,
      role: u.role,
      shopName: u.shopName ?? "",
      imageUrl: u.imageUrl ?? "",
    }));
  },
});

/**
 * List all 1-on-1 complaint/chat threads relevant to a user
 */
export const listUserTickets = query({
  args: {
    userId: v.id("users"),
    filterTab: v.optional(
      v.union(v.literal("all"), v.literal("admin_chats"), v.literal("pharmacist_chats"), v.literal("customer_chats"))
    ),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db.get(args.userId);
    if (!currentUser) return [];

    const allTickets = await ctx.db.query("complaintTickets").collect();

    // User is relevant if they created the ticket, or are the targetId, or if they are admin and ticket is admin-bound
    let userTickets = allTickets.filter((t) => {
      const isCreator = t.creatorId === currentUser._id;
      const isTarget = t.targetId === currentUser._id;
      const isAdminView = currentUser.role === "admin" && (t.targetType === "admin" || !t.targetId);
      return isCreator || isTarget || isAdminView;
    });

    // Populate user metadata for creator and target
    const joinedTickets = await Promise.all(
      userTickets.map(async (t) => {
        const creator = await ctx.db.get(t.creatorId);

        let target = null;
        if (t.targetId) {
          target = await ctx.db.get(t.targetId);
        }

        let creatorDisplayName = creator ? getDisplayName(creator) : "User";
        let targetDisplayName = target ? getDisplayName(target) : "MediVault Support (Admin)";
        let targetRole = target?.role ?? t.targetType ?? "admin";
        let targetShopName = target?.shopName ?? "";

        if (!target && (!t.targetType || t.targetType === "admin")) {
          targetDisplayName = "MediVault Support (Admin)";
          targetRole = "admin";
        }

        return {
          _id: t._id,
          _creationTime: t._creationTime,
          title: t.title,
          category: t.category ?? "General",
          status: t.status,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          creatorId: t.creatorId,
          creatorDisplayName,
          creatorEmail: creator?.email ?? "",
          creatorRole: creator?.role ?? "customer",
          targetId: t.targetId,
          targetType: t.targetType ?? targetRole,
          targetDisplayName,
          targetEmail: target?.email ?? "",
          targetRole: targetRole,
          targetShopName: targetShopName,
        };
      })
    );

    // Apply Tab Filtering
    let result = joinedTickets;
    if (args.filterTab === "admin_chats") {
      result = result.filter(
        (t) => t.creatorRole === "admin" || t.targetRole === "admin" || t.targetType === "admin"
      );
    } else if (args.filterTab === "pharmacist_chats") {
      result = result.filter(
        (t) => t.creatorRole === "pharmacist" || t.targetRole === "pharmacist" || t.targetType === "pharmacist"
      );
    } else if (args.filterTab === "customer_chats") {
      result = result.filter(
        (t) => t.creatorRole === "customer" || t.targetRole === "customer"
      );
    }

    // Apply Search Query
    if (args.searchQuery && args.searchQuery.trim()) {
      const q = args.searchQuery.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.creatorDisplayName.toLowerCase().includes(q) ||
          t.targetDisplayName.toLowerCase().includes(q) ||
          t.creatorEmail.toLowerCase().includes(q) ||
          t.targetShopName.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => b.updatedAt - a.updatedAt);
    return result;
  },
});

/**
 * Get all messages for a specific 1-on-1 ticket channel
 */
export const getTicketMessages = query({
  args: {
    ticketId: v.id("complaintTickets"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("complaintMessages")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .collect();

    const joined = await Promise.all(
      messages.map(async (m) => {
        const sender = await ctx.db.get(m.senderId);
        const senderDisplayName = sender ? getDisplayName(sender) : "User";
        return {
          _id: m._id,
          ticketId: m.ticketId,
          senderId: m.senderId,
          senderDisplayName,
          senderName: sender?.name ?? sender?.email?.split("@")[0] ?? "User",
          senderEmail: sender?.email ?? "Unknown",
          senderRole: sender?.role ?? "customer",
          senderImageUrl: sender?.imageUrl ?? "",
          message: m.message,
          timestamp: m.timestamp,
        };
      })
    );

    joined.sort((a, b) => a.timestamp - b.timestamp);
    return joined;
  },
});

/**
 * Initiate a new 1-on-1 chat or get an existing thread between 2 users.
 * Enforces strict role cross-messaging rules & sends recipient notification.
 */
export const createOrGetDirectTicket = mutation({
  args: {
    creatorId: v.id("users"),
    targetId: v.id("users"),
    title: v.string(),
    category: v.optional(v.string()),
    initialMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const creator = await ctx.db.get(args.creatorId);
    const target = await ctx.db.get(args.targetId);

    if (!creator || !target) {
      throw new Error("Invalid creator or target user.");
    }

    if (creator._id === target._id) {
      throw new Error("You cannot start a chat thread with yourself.");
    }

    if (creator.role === target.role) {
      throw new Error(`Direct messaging between two ${creator.role}s is not allowed.`);
    }

    if (!args.initialMessage.trim()) {
      throw new Error("Initial message cannot be empty.");
    }

    const category = args.category?.trim() || "General Inquiry";
    const now = Date.now();
    const creatorDisplayName = getDisplayName(creator);
    const targetDisplayName = getDisplayName(target);

    // Check if an open ticket already exists between creator and target
    const existingTickets = await ctx.db.query("complaintTickets").collect();
    const existing = existingTickets.find(
      (t) =>
        t.status === "open" &&
        ((t.creatorId === creator._id && t.targetId === target._id) ||
          (t.creatorId === target._id && t.targetId === creator._id))
    );

    let ticketId: Id<"complaintTickets">;

    if (existing) {
      ticketId = existing._id;
    } else {
      ticketId = await ctx.db.insert("complaintTickets", {
        creatorId: creator._id,
        targetId: target._id,
        targetType: target.role,
        category: category,
        title: args.title.trim() || `Chat: ${creatorDisplayName} & ${targetDisplayName}`,
        status: "open",
        createdAt: now,
        updatedAt: now,
      });
    }

    const cleanMsg = args.initialMessage.trim();

    // Insert initial message
    await ctx.db.insert("complaintMessages", {
      ticketId: ticketId,
      senderId: creator._id,
      message: cleanMsg,
      timestamp: now,
    });

    // Touch ticket updatedAt
    await ctx.db.patch(ticketId, {
      updatedAt: now,
    });

    // Send real-time Notification to Recipient
    const msgSnippet = cleanMsg.length > 50 ? cleanMsg.slice(0, 50) + "..." : cleanMsg;
    await ctx.db.insert("notifications", {
      senderId: creator._id,
      receiverId: target._id,
      message: `New chat from ${creatorDisplayName}: "${msgSnippet}"`,
      isRead: false,
      timestamp: now,
    });

    return ticketId;
  },
});

/**
 * Send a message into a 1-on-1 ticket thread in real-time & notify recipient
 */
export const sendMessage = mutation({
  args: {
    ticketId: v.id("complaintTickets"),
    senderId: v.id("users"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Chat thread not found.");
    }

    const sender = await ctx.db.get(args.senderId);
    if (!sender) {
      throw new Error("Sender user not found.");
    }

    if (!args.message.trim()) {
      throw new Error("Message text cannot be empty.");
    }

    const now = Date.now();
    const cleanMsg = args.message.trim();

    const msgId = await ctx.db.insert("complaintMessages", {
      ticketId: args.ticketId,
      senderId: sender._id,
      message: cleanMsg,
      timestamp: now,
    });

    await ctx.db.patch(args.ticketId, {
      updatedAt: now,
    });

    // Identify recipient for notification
    let recipientId: Id<"users"> | undefined;
    if (ticket.creatorId === sender._id && ticket.targetId) {
      recipientId = ticket.targetId;
    } else if (ticket.targetId === sender._id) {
      recipientId = ticket.creatorId;
    } else if (ticket.creatorId !== sender._id) {
      recipientId = ticket.creatorId;
    }

    if (recipientId) {
      const senderDisplayName = getDisplayName(sender);
      const msgSnippet = cleanMsg.length > 50 ? cleanMsg.slice(0, 50) + "..." : cleanMsg;
      await ctx.db.insert("notifications", {
        senderId: sender._id,
        receiverId: recipientId,
        message: `New message from ${senderDisplayName}: "${msgSnippet}"`,
        isRead: false,
        timestamp: now,
      });
    }

    return msgId;
  },
});

/**
 * Toggle ticket resolution status (open/resolved)
 */
export const toggleTicketStatus = mutation({
  args: {
    ticketId: v.id("complaintTickets"),
    status: v.union(v.literal("open"), v.literal("resolved")),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Ticket thread not found.");
    }

    const now = Date.now();
    await ctx.db.patch(args.ticketId, {
      status: args.status,
      updatedAt: now,
    });

    return { success: true, status: args.status };
  },
});
