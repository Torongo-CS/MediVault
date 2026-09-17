import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Helper: Resolve a valid customer ID
 */
async function resolveCustomerId(ctx: any, customerId?: Id<"users">, customerEmail?: string): Promise<Id<"users">> {
  if (customerId) return customerId;

  const email = (customerEmail || "customer@medivault.com").trim().toLowerCase();
  let user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();

  if (!user) {
    user = await ctx.db
      .query("users")
      .withIndex("by_role", (q: any) => q.eq("role", "customer"))
      .first();
  }

  if (user) {
    return user._id;
  }

  return await ctx.db.insert("users", {
    name: "Jane Customer",
    email,
    role: "customer",
    isActive: true,
  });
}

/**
 * Helper: Resolve a valid pharmacist ID
 */
async function resolvePharmacistId(ctx: any, pharmacistId?: Id<"users">): Promise<Id<"users">> {
  if (pharmacistId) return pharmacistId;

  let user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", "pharmacist@medivault.com"))
    .first();

  if (!user) {
    user = await ctx.db
      .query("users")
      .withIndex("by_role", (q: any) => q.eq("role", "pharmacist"))
      .first();
  }

  if (user) {
    return user._id;
  }

  return await ctx.db.insert("users", {
    name: "Dr. Alex Pharmacist",
    email: "pharmacist@medivault.com",
    role: "pharmacist",
    isActive: true,
  });
}

/**
 * Mutation: Create a new customer reservation (Checkout).
 * Status starts as "pending".
 */
export const create = mutation({
  args: {
    customerId: v.optional(v.id("users")),
    customerEmail: v.optional(v.string()),
    pharmacistId: v.optional(v.id("users")),
    medsList: v.array(
      v.object({
        medicineId: v.string(),
        quantity: v.number(),
      })
    ),
    prescriptionImageUrl: v.optional(v.string()),
    pickupDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const validCustomerId = await resolveCustomerId(ctx, args.customerId, args.customerEmail);

    let totalUnitsRequested = 0;
    let totalCosting = 0;
    let requiresPrescription = false;
    let inferredPharmacistId: Id<"users"> | undefined = args.pharmacistId;

    // Validate medicines, stock, and calculate total pricing
    for (const item of args.medsList) {
      let med: any = null;
      try {
        med = await ctx.db.get(item.medicineId as Id<"medicines">);
      } catch {
        // Non-Convex ID string (e.g. mock ID "med-1")
      }

      if (med) {
        if (med.requiresPrescription) {
          requiresPrescription = true;
        }

        if (!inferredPharmacistId && med.pharmacistId) {
          inferredPharmacistId = med.pharmacistId;
        }

        const availableStock = med.stock - med.reservedQuantity;
        if (item.quantity > availableStock && med.stock > 0) {
          throw new Error(
            `Insufficient stock for ${med.name}. Available: ${availableStock}, requested: ${item.quantity}`
          );
        }

        totalUnitsRequested += item.quantity;
        totalCosting += (med.unitSellingPrice || 5.0) * item.quantity;
      } else {
        totalUnitsRequested += item.quantity;
        totalCosting += 5.0 * item.quantity;
      }
    }

    if (requiresPrescription && !args.prescriptionImageUrl) {
      throw new Error(
        "One or more medicines in your order require a valid prescription. Please upload or attach your prescription before submitting."
      );
    }

    const defaultPickup = Date.now() + 24 * 60 * 60 * 1000;
    const reservationId = await ctx.db.insert("reservations", {
      customerId: validCustomerId,
      pharmacistId: inferredPharmacistId,
      medsList: args.medsList,
      totalUnitsRequested,
      totalCosting,
      createdAt: Date.now(),
      pickupDate: args.pickupDate || defaultPickup,
      prescriptionImageUrl: args.prescriptionImageUrl,
      status: "pending",
    });

    return reservationId;
  },
});

/**
 * Query: Get all reservations for a specific customer with medicine details.
 */
export const getByCustomerWithDetails = query({
  args: {
    customerId: v.optional(v.id("users")),
    customerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let validCustomerId = args.customerId;
    if (!validCustomerId && args.customerEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.customerEmail!.trim().toLowerCase()))
        .first();
      if (user) validCustomerId = user._id;
    }

    let rawReservations = [];
    if (!validCustomerId) {
      rawReservations = await ctx.db.query("reservations").order("desc").collect();
    } else {
      rawReservations = await ctx.db
        .query("reservations")
        .withIndex("by_customer", (q) => q.eq("customerId", validCustomerId!))
        .order("desc")
        .collect();
    }

    // Enrich with medicine details
    return await Promise.all(
      rawReservations.map(async (res) => {
        const medsWithDetails = await Promise.all(
          res.medsList.map(async (item) => {
            let med: any = null;
            try {
              med = await ctx.db.get(item.medicineId as Id<"medicines">);
            } catch {
              // safe catch
            }
            return {
              ...item,
              name: med ? med.name : item.medicineId,
              generic: med ? med.genericName : "",
              unitPrice: med ? med.unitSellingPrice : 5.0,
              rx: med ? med.requiresPrescription : false,
            };
          })
        );
        return {
          ...res,
          medsList: medsWithDetails,
        };
      })
    );
  },
});

/**
 * Query: Get all reservations for a specific customer.
 */
export const getByCustomer = query({
  args: {
    customerId: v.optional(v.id("users")),
    customerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let validCustomerId = args.customerId;
    if (!validCustomerId && args.customerEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.customerEmail!.trim().toLowerCase()))
        .first();
      if (user) validCustomerId = user._id;
    }

    if (!validCustomerId) {
      return await ctx.db.query("reservations").order("desc").collect();
    }

    return await ctx.db
      .query("reservations")
      .withIndex("by_customer", (q) => q.eq("customerId", validCustomerId!))
      .order("desc")
      .collect();
  },
});

/**
 * Query: Get single reservation detail by ID with medicine details.
 */
export const getByIdWithDetails = query({
  args: {
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, args) => {
    const res = await ctx.db.get(args.reservationId);
    if (!res) return null;

    const medsWithDetails = await Promise.all(
      res.medsList.map(async (item) => {
        let med: any = null;
        try {
          med = await ctx.db.get(item.medicineId as Id<"medicines">);
        } catch {
          // safe catch
        }
        return {
          ...item,
          name: med ? med.name : item.medicineId,
          generic: med ? med.genericName : "",
          unitPrice: med ? med.unitSellingPrice : 5.0,
          rx: med ? med.requiresPrescription : false,
        };
      })
    );
    
    // Also resolve pharmacist name if any
    let pharmacistName = "MediVault Pharmacy";
    if (res.pharmacistId) {
       const pharmacist = await ctx.db.get(res.pharmacistId);
       if (pharmacist && pharmacist.name) pharmacistName = pharmacist.name;
    }

    return {
      ...res,
      medsList: medsWithDetails,
      pharmacistName,
    };
  },
});

/**
 * Query: Get single reservation detail by ID.
 */
export const getById = query({
  args: {
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.reservationId);
  },
});

/**
 * Query: List reservations for Pharmacist desk (optionally filtered by status).
 */
export const listAll = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("reservations")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }

    return await ctx.db.query("reservations").order("desc").collect();
  },
});

/**
 * Query: List ALL reservations with enriched medicine + customer details (for pharmacist desk).
 */
export const listAllWithDetails = query({
  args: {},
  handler: async (ctx) => {
    const raw = await ctx.db.query("reservations").order("desc").collect();

    return await Promise.all(
      raw.map(async (res) => {
        // Resolve customer info
        const customer = await ctx.db.get(res.customerId);
        const customerEmail = customer ? customer.email : "Unknown Customer";
        const customerName = customer ? customer.name || customer.email : "Unknown";

        // Enrich med list
        const medsList = await Promise.all(
          res.medsList.map(async (item) => {
            let med: any = null;
            try {
              med = await ctx.db.get(item.medicineId as Id<"medicines">);
            } catch { /* safe catch */ }
            return {
              ...item,
              medicineName: med ? med.name : item.medicineId,
              genericName: med ? med.genericName : "",
              requiresPrescription: med ? med.requiresPrescription : false,
              conflicts: med ? (med.conflicts || []) : [],
              unitSellingPrice: med ? med.unitSellingPrice : 0,
            };
          })
        );

        // Resolve pharmacist name
        let pharmacistName: string | null = null;
        if (res.pharmacistId) {
          const ph = await ctx.db.get(res.pharmacistId);
          if (ph) pharmacistName = ph.name || ph.email;
        }

        const allConflicts = medsList.flatMap((m) => m.conflicts || []);

        return {
          ...res,
          customerEmail,
          customerName,
          medsList,
          pharmacistName,
          hasRxRequired: medsList.some((m) => m.requiresPrescription),
          allConflicts,
        };
      })
    );
  },
});

/**
 * Mutation: Pharmacist approves a pending reservation.
 */
export const approve = mutation({
  args: {
    reservationId: v.id("reservations"),
    pharmacistId: v.optional(v.id("users")),
    pharmacistNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const validPharmacistId = await resolvePharmacistId(ctx, args.pharmacistId);

    const res = await ctx.db.get(args.reservationId);
    if (!res) {
      throw new Error("Reservation not found.");
    }

    if (res.status !== "pending") {
      throw new Error(`Reservation is already ${res.status}.`);
    }

    // 1. Lock reserved quantities for each medicine
    for (const item of res.medsList) {
      try {
        const med = await ctx.db.get(item.medicineId as Id<"medicines">);
        if (med) {
          await ctx.db.patch(med._id, {
            reservedQuantity: med.reservedQuantity + item.quantity,
          });
        }
      } catch {
        // Safe catch for mock string IDs
      }
    }

    // 2. Update reservation status
    await ctx.db.patch(args.reservationId, {
      status: "approved",
      pharmacistId: validPharmacistId,
    });

    // 3. Send notification to customer
    const noteText = args.pharmacistNote ? ` Note: ${args.pharmacistNote}` : "";
    await ctx.db.insert("notifications", {
      senderId: validPharmacistId,
      receiverId: res.customerId,
      message: `Your medicine reservation #${args.reservationId.slice(-6)} has been approved by the pharmacist!${noteText}`,
      isRead: false,
      timestamp: Date.now(),
    });

    return true;
  },
});

/**
 * Mutation: Pharmacist rejects a pending reservation.
 */
export const reject = mutation({
  args: {
    reservationId: v.id("reservations"),
    pharmacistId: v.optional(v.id("users")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const validPharmacistId = await resolvePharmacistId(ctx, args.pharmacistId);

    const res = await ctx.db.get(args.reservationId);
    if (!res) {
      throw new Error("Reservation not found.");
    }

    if (res.status !== "pending") {
      throw new Error(`Reservation cannot be rejected because it is ${res.status}.`);
    }

    // Update status to cancelled
    await ctx.db.patch(args.reservationId, {
      status: "cancelled",
      pharmacistId: validPharmacistId,
    });

    // Send notification to customer
    await ctx.db.insert("notifications", {
      senderId: validPharmacistId,
      receiverId: res.customerId,
      message: `Your reservation #${args.reservationId.slice(-6)} was rejected. Reason: ${args.reason}`,
      isRead: false,
      timestamp: Date.now(),
    });

    return true;
  },
});

/**
 * Mutation: Mark order as ready for pickup.
 */
export const markReady = mutation({
  args: {
    reservationId: v.id("reservations"),
    pharmacistId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const validPharmacistId = await resolvePharmacistId(ctx, args.pharmacistId);

    const res = await ctx.db.get(args.reservationId);
    if (!res) throw new Error("Reservation not found.");

    await ctx.db.patch(args.reservationId, {
      pharmacistId: validPharmacistId,
    });

    await ctx.db.insert("notifications", {
      senderId: validPharmacistId,
      receiverId: res.customerId,
      message: `Your order #${args.reservationId.slice(-6)} is ready for pickup!`,
      isRead: false,
      timestamp: Date.now(),
    });
  },
});

/**
 * Mutation: Mark order as completed & fulfilled.
 */
export const completeOrder = mutation({
  args: {
    reservationId: v.id("reservations"),
    pharmacistId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const validPharmacistId = await resolvePharmacistId(ctx, args.pharmacistId);

    const res = await ctx.db.get(args.reservationId);
    if (!res) throw new Error("Reservation not found.");

    if (res.status === "completed") {
      throw new Error("Reservation is already marked as completed.");
    }

    const itemsSnapshot = [];

    for (const item of res.medsList) {
      let med: any = null;
      try {
        med = await ctx.db.get(item.medicineId as Id<"medicines">);
      } catch {
        // Safe catch for mock string IDs
      }

      if (med) {
        // Deduct physical stock and release reserved quantity
        const newStock = Math.max(0, med.stock - item.quantity);
        const newReserved = Math.max(0, med.reservedQuantity - item.quantity);

        await ctx.db.patch(med._id, {
          stock: newStock,
          reservedQuantity: newReserved,
        });

        itemsSnapshot.push({
          medicineId: item.medicineId,
          quantity: item.quantity,
          unitCostingPriceAtSale: med.unitCostingPrice,
          unitSellingPriceAtSale: med.unitSellingPrice,
        });
      } else {
        itemsSnapshot.push({
          medicineId: item.medicineId,
          quantity: item.quantity,
          unitCostingPriceAtSale: 3.0,
          unitSellingPriceAtSale: 5.0,
        });
      }
    }

    // Update reservation status to completed
    await ctx.db.patch(args.reservationId, {
      status: "completed",
      pharmacistId: validPharmacistId,
    });

    // Create transaction record entry
    await ctx.db.insert("transactionRecords", {
      reservationId: args.reservationId,
      completedAt: Date.now(),
      itemsSnapshot,
      totalRevenue: res.totalCosting,
    });

    // Send completion notification
    await ctx.db.insert("notifications", {
      senderId: validPharmacistId,
      receiverId: res.customerId,
      message: `Your order #${args.reservationId.slice(-6)} has been completed. Thank you!`,
      isRead: false,
      timestamp: Date.now(),
    });

    return true;
  },
});
