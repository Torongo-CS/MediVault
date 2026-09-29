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
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const { passwordHash, ...rest } = user;
    return rest;
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
 * List all active pharmacy shops for customer portal browsing
 */
export const listPharmacies = query({
  args: {},
  handler: async (ctx) => {
    const pharmacists = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "pharmacist"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return pharmacists.map((p) => ({
      _id: p._id,
      name: p.shopName || p.name || "Pharmacy Shop",
      pharmacistName: p.name || "Dr. Pharmacist",
      address: p.shopAddress || "Dhaka, Bangladesh",
      phone: p.phone || "+880 1700-000000",
      operatingHours: p.operatingHours || "09:00 AM - 10:00 PM",
      description: p.description || "Licensed pharmacy store providing genuine medicines.",
      imageUrl: p.imageUrl,
      rating: p.rating ?? 4.8,
    }));
  },
});

/**
 * Update profile details (name, phone, imageUrl, shop details)
 */
export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    shopName: v.optional(v.string()),
    shopAddress: v.optional(v.string()),
    operatingHours: v.optional(v.string()),
    description: v.optional(v.string()),
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
      ...(args.shopName !== undefined && { shopName: args.shopName.trim() }),
      ...(args.shopAddress !== undefined && { shopAddress: args.shopAddress.trim() }),
      ...(args.operatingHours !== undefined && { operatingHours: args.operatingHours.trim() }),
      ...(args.description !== undefined && { description: args.description.trim() }),
    });

    const updatedUser = await ctx.db.get(args.userId);
    if (!updatedUser) return null;
    const { passwordHash, ...rest } = updatedUser;
    return rest;
  },
});

/**
 * Get profile activity statistics for the dashboard/profile tab
 */
export const getUserStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    if (user.role === "customer") {
      const reservations = await ctx.db
        .query("reservations")
        .withIndex("by_customer", (q) => q.eq("customerId", args.userId))
        .collect();
      
      const prescriptions = await ctx.db
        .query("prescriptions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      const favorites = await ctx.db
        .query("favorites")
        .withIndex("by_customer", (q) => q.eq("customerId", args.userId))
        .collect();

      const activeReservations = reservations.filter(
        (r) => r.status === "pending" || r.status === "approved"
      ).length;

      const completedReservations = reservations.filter(
        (r) => r.status === "completed"
      ).length;

      return {
        role: "customer",
        totalReservations: reservations.length,
        activeReservations,
        completedReservations,
        totalPrescriptions: prescriptions.length,
        totalFavorites: favorites.length,
      };
    } else if (user.role === "pharmacist") {
      const medicines = await ctx.db
        .query("medicines")
        .withIndex("by_pharmacist", (q) => q.eq("pharmacistId", args.userId))
        .collect();

      const reservations = await ctx.db
        .query("reservations")
        .withIndex("by_pharmacist", (q) => q.eq("pharmacistId", args.userId))
        .collect();

      const pendingApprovals = reservations.filter((r) => r.status === "pending").length;
      const completedOrders = reservations.filter((r) => r.status === "completed").length;

      return {
        role: "pharmacist",
        totalInventoryItems: medicines.length,
        totalReservationsHandled: reservations.length,
        pendingApprovals,
        completedOrders,
      };
    } else {
      // admin
      const allUsers = await ctx.db.query("users").collect();
      const openComplaints = await ctx.db
        .query("complaintTickets")
        .withIndex("by_status", (q) => q.eq("status", "open"))
        .collect();

      return {
        role: "admin",
        totalUsers: allUsers.length,
        totalPharmacists: allUsers.filter((u) => u.role === "pharmacist").length,
        totalCustomers: allUsers.filter((u) => u.role === "customer").length,
        openComplaints: openComplaints.length,
      };
    }
  },
});

