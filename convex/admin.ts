import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// 1. USER MANAGEMENT CRUD
// ---------------------------------------------------------------------------

/**
 * List all users with optional role filtering and search query
 */
export const listUsers = query({
  args: {
    role: v.optional(
      v.union(v.literal("admin"), v.literal("pharmacist"), v.literal("customer"))
    ),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let users;
    if (args.role) {
      const roleFilter = args.role;
      users = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", roleFilter))
        .collect();
    } else {
      users = await ctx.db.query("users").collect();
    }

    if (args.searchQuery && args.searchQuery.trim()) {
      const q = args.searchQuery.trim().toLowerCase();
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.name && u.name.toLowerCase().includes(q)) ||
          u.role.toLowerCase().includes(q)
      );
    }

    return users.map((u) => ({
      _id: u._id,
      _creationTime: u._creationTime,
      name: u.name ?? u.email.split("@")[0],
      email: u.email,
      role: u.role,
      phone: u.phone ?? "",
      imageUrl: u.imageUrl ?? "",
      isActive: u.isActive ?? true,
      createdAt: u.createdAt ?? u._creationTime,
    }));
  },
});

/**
 * Create a new user (admin, pharmacist, or customer)
 */
export const createUser = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("pharmacist"), v.literal("customer")),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) {
      throw new Error("A user with this email address already exists.");
    }

    const userId = await ctx.db.insert("users", {
      email: normalizedEmail,
      role: args.role,
      name: args.name?.trim() ?? normalizedEmail.split("@")[0],
      phone: args.phone?.trim() ?? "",
      passwordHash: "dummy_hash", // Managed via auth flow or password reset
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Update user details
 */
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    email: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("admin"), v.literal("pharmacist"), v.literal("customer"))
    ),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const updates: Record<string, any> = {};

    if (args.email !== undefined && args.email.trim()) {
      const normalizedEmail = args.email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const existing = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
          .first();
        if (existing) {
          throw new Error("Email address is already in use by another account.");
        }
        updates.email = normalizedEmail;
      }
    }

    if (args.role !== undefined) updates.role = args.role;
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.phone !== undefined) updates.phone = args.phone.trim();
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.userId, updates);
    return await ctx.db.get(args.userId);
  },
});

/**
 * Toggle user active status
 */
export const toggleUserActive = mutation({
  args: {
    userId: v.id("users"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found.");
    }

    await ctx.db.patch(args.userId, { isActive: args.isActive });
    return { success: true, isActive: args.isActive };
  },
});

/**
 * Delete a user by ID
 */
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found.");
    }

    await ctx.db.delete(args.userId);
    return { success: true };
  },
});


// ---------------------------------------------------------------------------
// 2. PHARMACIST MANAGEMENT CRUD
// ---------------------------------------------------------------------------

/**
 * List all users registered with the pharmacist role
 */
export const listPharmacists = query({
  args: {
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let pharmacists = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "pharmacist"))
      .collect();

    if (args.searchQuery && args.searchQuery.trim()) {
      const q = args.searchQuery.trim().toLowerCase();
      pharmacists = pharmacists.filter(
        (p) =>
          p.email.toLowerCase().includes(q) ||
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.phone && p.phone.toLowerCase().includes(q))
      );
    }

    return pharmacists.map((p) => ({
      _id: p._id,
      _creationTime: p._creationTime,
      name: p.name ?? p.email.split("@")[0],
      email: p.email,
      phone: p.phone ?? "",
      imageUrl: p.imageUrl ?? "",
      isActive: p.isActive ?? true,
      createdAt: p.createdAt ?? p._creationTime,
    }));
  },
});


// ---------------------------------------------------------------------------
// 3. MEDICINE CATALOG CRUD
// ---------------------------------------------------------------------------

/**
 * List all medicines in the catalog with optional search & prescription filter
 */
export const listMedicines = query({
  args: {
    searchQuery: v.optional(v.string()),
    rxFilter: v.optional(v.union(v.literal("all"), v.literal("otc"), v.literal("rx"))),
  },
  handler: async (ctx, args) => {
    let meds = await ctx.db.query("medicines").collect();

    if (args.rxFilter === "otc") {
      meds = meds.filter((m) => !m.requiresPrescription);
    } else if (args.rxFilter === "rx") {
      meds = meds.filter((m) => m.requiresPrescription);
    }

    if (args.searchQuery && args.searchQuery.trim()) {
      const q = args.searchQuery.trim().toLowerCase();
      meds = meds.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.genericName.toLowerCase().includes(q) ||
          m.symptoms.some((s) => s.toLowerCase().includes(q))
      );
    }

    return meds;
  },
});

/**
 * Create a new medicine document
 */
export const createMedicine = mutation({
  args: {
    name: v.string(),
    genericName: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    symptoms: v.array(v.string()),
    requiresPrescription: v.boolean(),
    stock: v.number(),
    unitCostingPrice: v.number(),
    unitSellingPrice: v.number(),
    expiryDate: v.number(),
    conflicts: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const medId = await ctx.db.insert("medicines", {
      name: args.name.trim(),
      genericName: args.genericName.trim(),
      description: args.description.trim(),
      imageUrl: args.imageUrl,
      symptoms: args.symptoms,
      requiresPrescription: args.requiresPrescription,
      stock: Math.max(0, args.stock),
      reservedQuantity: 0,
      unitCostingPrice: Math.max(0, args.unitCostingPrice),
      unitSellingPrice: Math.max(0, args.unitSellingPrice),
      expiryDate: args.expiryDate,
      conflicts: args.conflicts,
    });

    return medId;
  },
});

/**
 * Update medicine details
 */
export const updateMedicine = mutation({
  args: {
    medicineId: v.id("medicines"),
    name: v.optional(v.string()),
    genericName: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    symptoms: v.optional(v.array(v.string())),
    requiresPrescription: v.optional(v.boolean()),
    stock: v.optional(v.number()),
    unitCostingPrice: v.optional(v.number()),
    unitSellingPrice: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
    conflicts: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const med = await ctx.db.get(args.medicineId);
    if (!med) {
      throw new Error("Medicine not found.");
    }

    const updates: Record<string, any> = {};

    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.genericName !== undefined) updates.genericName = args.genericName.trim();
    if (args.description !== undefined) updates.description = args.description.trim();
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
    if (args.symptoms !== undefined) updates.symptoms = args.symptoms;
    if (args.requiresPrescription !== undefined) updates.requiresPrescription = args.requiresPrescription;
    if (args.stock !== undefined) updates.stock = Math.max(0, args.stock);
    if (args.unitCostingPrice !== undefined) updates.unitCostingPrice = Math.max(0, args.unitCostingPrice);
    if (args.unitSellingPrice !== undefined) updates.unitSellingPrice = Math.max(0, args.unitSellingPrice);
    if (args.expiryDate !== undefined) updates.expiryDate = args.expiryDate;
    if (args.conflicts !== undefined) updates.conflicts = args.conflicts;

    await ctx.db.patch(args.medicineId, updates);
    return await ctx.db.get(args.medicineId);
  },
});

/**
 * Delete a medicine document from catalog
 */
export const deleteMedicine = mutation({
  args: {
    medicineId: v.id("medicines"),
  },
  handler: async (ctx, args) => {
    const med = await ctx.db.get(args.medicineId);
    if (!med) {
      throw new Error("Medicine not found.");
    }

    await ctx.db.delete(args.medicineId);
    return { success: true };
  },
});


// ---------------------------------------------------------------------------
// 4. COMPLAINT TICKETS & MESSAGING CRUD
// ---------------------------------------------------------------------------

/**
 * List all complaint tickets joined with creator details
 */
export const listComplaintTickets = query({
  args: {
    status: v.optional(v.union(v.literal("all"), v.literal("open"), v.literal("resolved"))),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let tickets = await ctx.db.query("complaintTickets").collect();

    if (args.status && args.status !== "all") {
      tickets = tickets.filter((t) => t.status === args.status);
    }

    // Join creator details
    const result = await Promise.all(
      tickets.map(async (t) => {
        const creator = await ctx.db.get(t.creatorId);
        return {
          _id: t._id,
          _creationTime: t._creationTime,
          title: t.title,
          status: t.status,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          creatorId: t.creatorId,
          creatorEmail: creator?.email ?? "Unknown User",
          creatorName: creator?.name ?? creator?.email?.split("@")[0] ?? "Unknown User",
          creatorRole: creator?.role ?? "customer",
        };
      })
    );

    result.sort((a, b) => b.updatedAt - a.updatedAt);

    if (args.searchQuery && args.searchQuery.trim()) {
      const q = args.searchQuery.trim().toLowerCase();
      return result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.creatorEmail.toLowerCase().includes(q) ||
          t.creatorName.toLowerCase().includes(q)
      );
    }

    return result;
  },
});

/**
 * Get messages for a ticket
 */
export const getComplaintMessages = query({
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
        return {
          _id: m._id,
          ticketId: m.ticketId,
          senderId: m.senderId,
          senderEmail: sender?.email ?? "Unknown",
          senderName: sender?.name ?? "Unknown",
          senderRole: sender?.role ?? "customer",
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
 * Send an admin reply message to a ticket
 */
export const sendAdminReply = mutation({
  args: {
    ticketId: v.id("complaintTickets"),
    adminId: v.id("users"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Complaint ticket not found.");
    }

    if (!args.message.trim()) {
      throw new Error("Message text cannot be empty.");
    }

    const msgId = await ctx.db.insert("complaintMessages", {
      ticketId: args.ticketId,
      senderId: args.adminId,
      message: args.message.trim(),
      timestamp: Date.now(),
    });

    // Update ticket timestamp
    await ctx.db.patch(args.ticketId, {
      updatedAt: Date.now(),
    });

    return msgId;
  },
});

/**
 * Toggle complaint ticket status (open/resolved)
 */
export const toggleTicketStatus = mutation({
  args: {
    ticketId: v.id("complaintTickets"),
    status: v.union(v.literal("open"), v.literal("resolved")),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Complaint ticket not found.");
    }

    await ctx.db.patch(args.ticketId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true, status: args.status };
  },
});


// ---------------------------------------------------------------------------
// 5. ADMIN DASHBOARD & REPORTS METRICS
// ---------------------------------------------------------------------------

/**
 * Get real-time system metrics for Admin Dashboard
 */
export const getDashboardMetrics = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const medicines = await ctx.db.query("medicines").collect();
    const tickets = await ctx.db.query("complaintTickets").collect();
    const transactions = await ctx.db.query("transactionRecords").collect();
    const reservations = await ctx.db.query("reservations").collect();

    const totalUsers = users.length;
    const totalPharmacists = users.filter((u) => u.role === "pharmacist").length;
    const totalCustomers = users.filter((u) => u.role === "customer").length;
    const totalAdmins = users.filter((u) => u.role === "admin").length;

    const totalMedicines = medicines.length;
    const lowStockMedicines = medicines.filter((m) => m.stock < 50).length;

    const totalTickets = tickets.length;
    const openTickets = tickets.filter((t) => t.status === "open").length;

    const totalRevenue = transactions.reduce((sum, t) => sum + t.totalRevenue, 0);
    const totalOrders = reservations.length;
    const pendingOrders = reservations.filter((r) => r.status === "pending").length;

    return {
      totalUsers,
      totalPharmacists,
      totalCustomers,
      totalAdmins,
      totalMedicines,
      lowStockMedicines,
      totalTickets,
      openTickets,
      totalRevenue,
      totalOrders,
      pendingOrders,
    };
  },
});

/**
 * Get system financial & inventory reports data
 */
export const getReportsData = query({
  args: {},
  handler: async (ctx) => {
    const medicines = await ctx.db.query("medicines").collect();
    const transactions = await ctx.db.query("transactionRecords").collect();
    const reservations = await ctx.db.query("reservations").collect();
    const users = await ctx.db.query("users").collect();

    // Financial totals
    const totalRevenue = transactions.reduce((sum, t) => sum + t.totalRevenue, 0);
    
    // Inventory valuation
    const totalStockUnits = medicines.reduce((sum, m) => sum + m.stock, 0);
    const totalInventoryValue = medicines.reduce((sum, m) => sum + (m.stock * m.unitSellingPrice), 0);
    const totalInventoryCost = medicines.reduce((sum, m) => sum + (m.stock * m.unitCostingPrice), 0);

    // Reservation status distribution
    const statusCounts = {
      pending: reservations.filter((r) => r.status === "pending").length,
      approved: reservations.filter((r) => r.status === "approved").length,
      completed: reservations.filter((r) => r.status === "completed").length,
      cancelled: reservations.filter((r) => r.status === "cancelled").length,
    };

    // User breakdown
    const userRoleCounts = {
      customer: users.filter((u) => u.role === "customer").length,
      pharmacist: users.filter((u) => u.role === "pharmacist").length,
      admin: users.filter((u) => u.role === "admin").length,
    };

    // Top medicines by stock value
    const topMedicinesByValue = [...medicines]
      .sort((a, b) => (b.stock * b.unitSellingPrice) - (a.stock * a.unitSellingPrice))
      .slice(0, 5)
      .map((m) => ({
        id: m._id,
        name: m.name,
        genericName: m.genericName,
        stock: m.stock,
        sellingPrice: m.unitSellingPrice,
        totalValue: m.stock * m.unitSellingPrice,
      }));

    return {
      totalRevenue,
      totalStockUnits,
      totalInventoryValue,
      totalInventoryCost,
      statusCounts,
      userRoleCounts,
      topMedicinesByValue,
    };
  },
});
