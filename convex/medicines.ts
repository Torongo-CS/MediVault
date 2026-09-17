import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

/**
 * Query: List & search medicines from the catalog.
 * Supports filtering by search term (name, genericName, symptom) and stock availability.
 */
export const list = query({
  args: {
    searchQuery: v.optional(v.string()),
    inStockOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let medicines = await ctx.db.query("medicines").collect();

    if (args.inStockOnly) {
      medicines = medicines.filter((m) => m.stock > m.reservedQuantity);
    }

    if (args.searchQuery && args.searchQuery.trim() !== "") {
      const q = args.searchQuery.trim().toLowerCase();
      medicines = medicines.filter((m) => {
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesGeneric = m.genericName.toLowerCase().includes(q);
        const matchesSymptom = m.symptoms.some((s) => s.toLowerCase().includes(q));
        return matchesName || matchesGeneric || matchesSymptom;
      });
    }

    return medicines;
  },
});

/**
 * Query: List unique medicine inventory for a specific pharmacy/pharmacist.
 */
export const listByPharmacist = query({
  args: {
    pharmacistId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.pharmacistId) {
      return await ctx.db
        .query("medicines")
        .withIndex("by_pharmacist", (q) => q.eq("pharmacistId", args.pharmacistId))
        .collect();
    }
    return await ctx.db.query("medicines").collect();
  },
});

/**
 * Query: Fetch a single medicine document by ID.
 */
export const getById = query({
  args: {
    medicineId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      return (await ctx.db.get(args.medicineId as any)) as Doc<"medicines"> | null;
    } catch {
      return null;
    }
  },
});

/**
 * Query: Check drug interaction conflicts among a list of medicine IDs.
 * Returns an array of warning messages if any medicine's generic name is listed
 * in another medicine's `conflicts` array.
 */
export const checkConflicts = query({
  args: {
    medicineIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.medicineIds.length <= 1) {
      return [];
    }

    const medicines = await Promise.all(
      args.medicineIds.map(async (id) => {
        try {
          return (await ctx.db.get(id as any)) as Doc<"medicines"> | null;
        } catch {
          return null;
        }
      })
    );

    const validMeds = medicines.filter((m): m is Doc<"medicines"> => m !== null);
    const warnings: string[] = [];

    const genericNames = validMeds.map((m) => m!.genericName.toLowerCase());

    for (const med of validMeds) {
      if (!med || !med.conflicts) continue;
      for (const conflict of med.conflicts) {
        const conflictLower = conflict.toLowerCase();
        if (genericNames.includes(conflictLower)) {
          const matchingMed = validMeds.find(
            (m) => m!.genericName.toLowerCase() === conflictLower
          );
          const warningMsg = `Conflict Warning: ${med.name} (${med.genericName}) interacts negatively with ${matchingMed?.name || conflict} (${conflict}).`;
          if (!warnings.includes(warningMsg)) {
            warnings.push(warningMsg);
          }
        }
      }
    }

    return warnings;
  },
});

/**
 * Mutation: Create a new medicine record in the database for a pharmacy store.
 */
export const createMedicine = mutation({
  args: {
    pharmacistId: v.id("users"),
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
    return await ctx.db.insert("medicines", {
      pharmacistId: args.pharmacistId,
      name: args.name.trim(),
      genericName: args.genericName.trim(),
      description: args.description.trim(),
      imageUrl: args.imageUrl || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500",
      symptoms: args.symptoms,
      requiresPrescription: args.requiresPrescription,
      stock: Math.max(0, args.stock),
      reservedQuantity: 0,
      unitCostingPrice: args.unitCostingPrice,
      unitSellingPrice: args.unitSellingPrice,
      expiryDate: args.expiryDate,
      conflicts: args.conflicts,
    });
  },
});

/**
 * Mutation: Update an existing medicine record in the database.
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
      throw new Error("Medicine record not found.");
    }

    const updates: Partial<Doc<"medicines">> = {};
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.genericName !== undefined) updates.genericName = args.genericName.trim();
    if (args.description !== undefined) updates.description = args.description.trim();
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
    if (args.symptoms !== undefined) updates.symptoms = args.symptoms;
    if (args.requiresPrescription !== undefined) updates.requiresPrescription = args.requiresPrescription;
    if (args.stock !== undefined) updates.stock = Math.max(0, args.stock);
    if (args.unitCostingPrice !== undefined) updates.unitCostingPrice = args.unitCostingPrice;
    if (args.unitSellingPrice !== undefined) updates.unitSellingPrice = args.unitSellingPrice;
    if (args.expiryDate !== undefined) updates.expiryDate = args.expiryDate;
    if (args.conflicts !== undefined) updates.conflicts = args.conflicts;

    await ctx.db.patch(args.medicineId, updates);
    return await ctx.db.get(args.medicineId);
  },
});

/**
 * Mutation: Quick stock adjustment (increment / decrement).
 */
export const adjustStock = mutation({
  args: {
    medicineId: v.id("medicines"),
    delta: v.number(),
  },
  handler: async (ctx, args) => {
    const med = await ctx.db.get(args.medicineId);
    if (!med) {
      throw new Error("Medicine not found.");
    }

    const newStock = Math.max(0, med.stock + args.delta);
    await ctx.db.patch(args.medicineId, { stock: newStock });
    return newStock;
  },
});

/**
 * Mutation: Delete a medicine record from the database.
 */
export const deleteMedicine = mutation({
  args: {
    medicineId: v.id("medicines"),
  },
  handler: async (ctx, args) => {
    const med = await ctx.db.get(args.medicineId);
    if (!med) {
      throw new Error("Medicine record not found.");
    }
    await ctx.db.delete(args.medicineId);
    return true;
  },
});
