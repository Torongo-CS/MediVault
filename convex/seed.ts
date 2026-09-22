import { v, ConvexError } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { hashPassword, normalizeEmail } from "./auth";
import dummyData from "./dummyData.json";

/**
 * Creates (or resets) the single fixed admin account.
 *
 *   bunx convex env set ADMIN_EMAIL admin@medivault.com
 *   bunx convex env set ADMIN_PASSWORD '<a strong password>'
 *   bunx convex run seed:createAdmin
 *
 * Arguments override the environment variables:
 *
 *   bunx convex run seed:createAdmin '{"email":"admin@medivault.com","password":"..."}'
 *
 * Idempotent: re-running resets the existing admin's password rather than
 * inserting a duplicate.
 */
export const createAdmin = internalAction({
  args: {
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  returns: v.object({ userId: v.id("users"), created: v.boolean() }),
  handler: async (ctx, args): Promise<{ userId: Id<"users">; created: boolean }> => {
    const procEnv = (globalThis as Record<string, any>).process?.env ?? {};
    const email = normalizeEmail(args.email ?? procEnv.ADMIN_EMAIL ?? "");
    const password = args.password ?? procEnv.ADMIN_PASSWORD ?? "";
    const name = args.name ?? "MediVault Admin";

    if (email.length === 0) {
      throw new ConvexError(
        "No admin email. Pass {\"email\":\"...\"} or run: bunx convex env set ADMIN_EMAIL <email>",
      );
    }
    if (password.length < 8) {
      throw new ConvexError(
        "Admin password must be at least 8 characters. Pass {\"password\":\"...\"} or run: bunx convex env set ADMIN_PASSWORD <password>",
      );
    }

    const passwordHash = await hashPassword(password);
    return await ctx.runMutation(internal.seed.upsertAdmin, {
      name,
      email,
      passwordHash,
    });
  },
});

export const upsertAdmin = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
  },
  returns: v.object({ userId: v.id("users"), created: v.boolean() }),
  handler: async (ctx, args): Promise<{ userId: Id<"users">; created: boolean }> => {
    const existing: Doc<"users"> | null = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing !== null) {
      await ctx.db.patch("users", existing._id, {
        passwordHash: args.passwordHash,
        role: "admin",
        isActive: true,
      });
      return { userId: existing._id, created: false };
    }

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      passwordHash: args.passwordHash,
      role: "admin",
      isActive: true,
    });
    return { userId, created: true };
  },
});

/**
 * Seed all database tables from teammates' dummyData.json
 */
export const seedAll = action({
  args: {},
  handler: async (ctx) => {
    const defaultPasswordHash = await hashPassword("password123");

    const usersToSeed: any[] = dummyData.users.map((u) => {
      let defaultName = u.name || "User";

      return {
        dummyId: u._id,
        name: defaultName,
        role: u.role as "admin" | "pharmacist" | "customer",
        email: u.email,
        phone: u.phone,
        passwordHash: defaultPasswordHash,
        imageUrl: u.imageUrl,
        isActive: u.isActive,
        shopName: u.shopName,
        shopAddress: u.shopAddress,
        operatingHours: u.operatingHours,
        description: u.description,
        rating: u.rating,
      };
    });

    if (!usersToSeed.some((u) => u.email === "customer@medivault.com")) {
      usersToSeed.push({
        dummyId: "user_customer_default",
        name: "Jane Customer",
        role: "customer",
        email: "customer@medivault.com",
        passwordHash: defaultPasswordHash,
        isActive: true,
      });
    }

    await ctx.runMutation(internal.seed.seedFromDummyData, {
      users: usersToSeed,
    });

    return "Successfully seeded database from dummyData.json with accounts: admin@medivault.com, pharmacist@medivault.com, carepoint@medivault.com, medicare@medivault.com, greencross@medivault.com, lazzpharma@medivault.com (password: password123)";
  },
});

export const seedFromDummyData = internalMutation({
  args: {
    users: v.array(
      v.object({
        dummyId: v.string(),
        name: v.string(),
        role: v.union(v.literal("admin"), v.literal("pharmacist"), v.literal("customer")),
        email: v.string(),
        phone: v.optional(v.string()),
        passwordHash: v.string(),
        imageUrl: v.optional(v.string()),
        isActive: v.boolean(),
        shopName: v.optional(v.string()),
        shopAddress: v.optional(v.string()),
        operatingHours: v.optional(v.string()),
        description: v.optional(v.string()),
        rating: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const tablesToWipe = [
      "transactionRecords",
      "notifications",
      "complaintMessages",
      "complaintTickets",
      "favorites",
      "prescriptions",
      "reservations",
      "medicines",
      "users",
    ] as const;

    for (const table of tablesToWipe) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }

    const userIdMap: Record<string, Id<"users">> = {};
    for (const u of args.users) {
      const insertedId = await ctx.db.insert("users", {
        name: u.name,
        role: u.role,
        email: normalizeEmail(u.email),
        phone: u.phone,
        passwordHash: u.passwordHash,
        imageUrl: u.imageUrl,
        isActive: u.isActive,
        shopName: u.shopName,
        shopAddress: u.shopAddress,
        operatingHours: u.operatingHours,
        description: u.description,
        rating: u.rating,
      });
      userIdMap[u.dummyId] = insertedId;
    }

    const medIdMap: Record<string, Id<"medicines">> = {};
    for (const med of dummyData.medicines) {
      const pharmacistId = med.pharmacistId ? userIdMap[med.pharmacistId] : undefined;
      const insertedId = await ctx.db.insert("medicines", {
        name: med.name,
        genericName: med.genericName,
        description: med.description,
        imageUrl: med.imageUrl,
        symptoms: med.symptoms,
        requiresPrescription: med.requiresPrescription,
        stock: med.stock,
        reservedQuantity: med.reservedQuantity,
        unitCostingPrice: med.unitCostingPrice,
        unitSellingPrice: med.unitSellingPrice,
        expiryDate: med.expiryDate,
        conflicts: med.conflicts,
        pharmacistId,
      });
      medIdMap[med._id] = insertedId;
    }

    const reservationIdMap: Record<string, Id<"reservations">> = {};
    for (const res of dummyData.reservations) {
      const customerId = userIdMap[res.customerId];
      if (!customerId) continue;
      const pharmacistId = res.pharmacistId ? userIdMap[res.pharmacistId] : undefined;

      const insertedId = await ctx.db.insert("reservations", {
        customerId,
        pharmacistId,
        medsList: res.medsList.map((item) => ({
          medicineId: medIdMap[item.medicineId] ?? item.medicineId,
          quantity: item.quantity,
        })),
        totalUnitsRequested: res.totalUnitsRequested,
        totalCosting: res.totalCosting,
        createdAt: res.createdAt,
        pickupDate: res.pickupDate,
        prescriptionImageUrl: res.prescriptionImageUrl,
        status: res.status as "pending" | "approved" | "completed" | "cancelled",
      });
      reservationIdMap[res._id] = insertedId;
    }

    for (const pres of dummyData.prescriptions) {
      const userId = userIdMap[pres.userId];
      if (!userId) continue;

      await ctx.db.insert("prescriptions", {
        name: pres.name,
        dateUploaded: pres.dateUploaded,
        imageUrl: pres.imageUrl,
        userId,
      });
    }

    for (const fav of dummyData.favorites) {
      const customerId = userIdMap[fav.customerId];
      const pharmacistId = userIdMap[fav.pharmacistId];
      if (!customerId || !pharmacistId) continue;

      await ctx.db.insert("favorites", {
        customerId,
        pharmacistId,
      });
    }

    const ticketIdMap: Record<string, Id<"complaintTickets">> = {};
    for (const ticket of dummyData.complaintTickets) {
      const creatorId = userIdMap[ticket.creatorId];
      if (!creatorId) continue;

      const targetId = ticket.targetId ? userIdMap[ticket.targetId] : undefined;

      const insertedId = await ctx.db.insert("complaintTickets", {
        creatorId,
        targetId,
        targetType: (ticket.targetType as any) ?? "admin",
        category: ticket.category ?? "General",
        title: ticket.title,
        status: ticket.status as "open" | "resolved",
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      });
      ticketIdMap[ticket._id] = insertedId;
    }

    for (const msg of dummyData.complaintMessages) {
      const ticketId = ticketIdMap[msg.ticketId];
      const senderId = userIdMap[msg.senderId];
      if (!ticketId || !senderId) continue;

      await ctx.db.insert("complaintMessages", {
        ticketId,
        senderId,
        message: msg.message,
        timestamp: msg.timestamp,
      });
    }

    for (const notif of dummyData.notifications) {
      const senderId = userIdMap[notif.senderId];
      const receiverId = userIdMap[notif.receiverId];
      if (!senderId || !receiverId) continue;

      await ctx.db.insert("notifications", {
        senderId,
        receiverId,
        message: notif.message,
        isRead: notif.isRead,
        timestamp: notif.timestamp,
      });
    }

    for (const trans of dummyData.transactionRecords) {
      const reservationId = reservationIdMap[trans.reservationId];
      if (!reservationId) continue;

      await ctx.db.insert("transactionRecords", {
        reservationId,
        completedAt: trans.completedAt,
        itemsSnapshot: trans.itemsSnapshot.map((item) => ({
          medicineId: medIdMap[item.medicineId] ?? item.medicineId,
          quantity: item.quantity,
          unitCostingPriceAtSale: item.unitCostingPriceAtSale,
          unitSellingPriceAtSale: item.unitSellingPriceAtSale,
        })),
        totalRevenue: trans.totalRevenue,
      });
    }

    return "Database successfully seeded from dummyData.json!";
  },
});


