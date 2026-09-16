import { v, ConvexError } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { hashPassword, normalizeEmail } from "./auth";

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
 * Seed all test accounts: Customer, Pharmacist, and Admin
 */
export const seedAll = action({
  args: {},
  handler: async (ctx) => {
    const dummyUsers = [
      {
        name: "Jane Customer",
        email: "customer@medivault.com",
        password: "password123",
        role: "customer" as const,
      },
      {
        name: "Dr. Alex Pharmacist",
        email: "pharmacist@medivault.com",
        password: "password123",
        role: "pharmacist" as const,
      },
      {
        name: "System Admin",
        email: "admin@medivault.com",
        password: "password123",
        role: "admin" as const,
      },
    ];

    for (const u of dummyUsers) {
      const passwordHash = await hashPassword(u.password);
      await ctx.runMutation(internal.auth.upsertUser, {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
      });
    }

    // Seed dummy medicines if table is empty
    await ctx.runMutation(internal.seed.seedMedicines, {});

    return "Successfully seeded users and medicines!";
  },
});

export const seedMedicines = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("medicines").collect();
    if (existing.length > 0) return;

    const medicines = [
      {
        name: "Paracetamol 500mg",
        genericName: "Paracetamol",
        description: "Pain reliever and fever reducer",
        imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500",
        symptoms: ["headache", "fever", "pain"],
        requiresPrescription: false,
        stock: 100,
        reservedQuantity: 0,
        unitCostingPrice: 2.5,
        unitSellingPrice: 5.0,
        expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000,
        conflicts: ["Warfarin"],
      },
      {
        name: "Amoxicillin 250mg",
        genericName: "Amoxicillin",
        description: "Penicillin antibiotic for bacterial infections",
        imageUrl: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500",
        symptoms: ["infection", "fever", "bacterial infection"],
        requiresPrescription: true,
        stock: 50,
        reservedQuantity: 0,
        unitCostingPrice: 8.0,
        unitSellingPrice: 15.0,
        expiryDate: Date.now() + 180 * 24 * 60 * 60 * 1000,
        conflicts: [],
      },
      {
        name: "Ibuprofen 400mg",
        genericName: "Ibuprofen",
        description: "Nonsteroidal anti-inflammatory drug (NSAID)",
        imageUrl: "https://images.unsplash.com/photo-1550572017-edd951b55104?w=500",
        symptoms: ["fever", "inflammation", "pain", "headache"],
        requiresPrescription: false,
        stock: 200,
        reservedQuantity: 0,
        unitCostingPrice: 3.0,
        unitSellingPrice: 6.5,
        expiryDate: Date.now() + 300 * 24 * 60 * 60 * 1000,
        conflicts: ["Paracetamol", "Aspirin"],
      },
      {
        name: "Warfarin 5mg",
        genericName: "Warfarin",
        description: "Anticoagulant blood thinner medication",
        imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500",
        symptoms: ["blood clot", "heart condition"],
        requiresPrescription: true,
        stock: 40,
        reservedQuantity: 0,
        unitCostingPrice: 12.0,
        unitSellingPrice: 25.0,
        expiryDate: Date.now() + 200 * 24 * 60 * 60 * 1000,
        conflicts: ["Paracetamol", "Ibuprofen"],
      },
    ];

    for (const med of medicines) {
      await ctx.db.insert("medicines", med);
    }
  },
});

