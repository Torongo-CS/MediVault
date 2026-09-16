import { mutation, query } from "./_generated/server";
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

const medicineFields = {
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
};

function normalizeList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function validateMedicineValues(args: {
  name: string;
  genericName: string;
  stock: number;
  unitCostingPrice: number;
  unitSellingPrice: number;
  expiryDate: number;
}) {
  if (!args.name.trim() || !args.genericName.trim()) {
    throw new Error("Medicine name and generic name are required.");
  }
  if (![args.stock, args.unitCostingPrice, args.unitSellingPrice, args.expiryDate].every(Number.isFinite)) {
    throw new Error("Stock, prices, and expiry date must be valid numbers.");
  }
  if (args.stock < 0 || args.unitCostingPrice < 0 || args.unitSellingPrice < 0) {
    throw new Error("Stock and prices cannot be negative.");
  }
}

/** Create a medicine in the inventory. */
export const create = mutation({
  args: medicineFields,
  handler: async (ctx, args) => {
    validateMedicineValues(args);
    return await ctx.db.insert("medicines", {
      ...args,
      name: args.name.trim(),
      genericName: args.genericName.trim(),
      description: args.description.trim(),
      symptoms: normalizeList(args.symptoms),
      conflicts: normalizeList(args.conflicts),
      stock: args.stock,
      reservedQuantity: 0,
      unitCostingPrice: args.unitCostingPrice,
      unitSellingPrice: args.unitSellingPrice,
    });
  },
});

/** Update editable medicine fields in the inventory. */
export const update = mutation({
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
    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine) throw new Error("Medicine not found.");

    const nextStock = args.stock ?? medicine.stock;
    const nextCost = args.unitCostingPrice ?? medicine.unitCostingPrice;
    const nextSelling = args.unitSellingPrice ?? medicine.unitSellingPrice;
    validateMedicineValues({
      name: args.name ?? medicine.name,
      genericName: args.genericName ?? medicine.genericName,
      stock: nextStock,
      unitCostingPrice: nextCost,
      unitSellingPrice: nextSelling,
      expiryDate: args.expiryDate ?? medicine.expiryDate,
    });
    if (nextStock < medicine.reservedQuantity) {
      throw new Error(`Stock cannot be lower than reserved quantity (${medicine.reservedQuantity}).`);
    }

    const updates: {
      name?: string;
      genericName?: string;
      description?: string;
      imageUrl?: string;
      symptoms?: string[];
      requiresPrescription?: boolean;
      stock?: number;
      unitCostingPrice?: number;
      unitSellingPrice?: number;
      expiryDate?: number;
      conflicts?: string[];
    } = {};
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.genericName !== undefined) updates.genericName = args.genericName.trim();
    if (args.description !== undefined) updates.description = args.description.trim();
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
    if (args.symptoms !== undefined) updates.symptoms = normalizeList(args.symptoms);
    if (args.requiresPrescription !== undefined) updates.requiresPrescription = args.requiresPrescription;
    if (args.stock !== undefined) updates.stock = args.stock;
    if (args.unitCostingPrice !== undefined) updates.unitCostingPrice = args.unitCostingPrice;
    if (args.unitSellingPrice !== undefined) updates.unitSellingPrice = args.unitSellingPrice;
    if (args.expiryDate !== undefined) updates.expiryDate = args.expiryDate;
    if (args.conflicts !== undefined) updates.conflicts = normalizeList(args.conflicts);

    await ctx.db.patch(args.medicineId, updates);
    return await ctx.db.get(args.medicineId);
  },
});

/** Atomically increase or decrease stock while preserving reserved units. */
export const adjustStock = mutation({
  args: { medicineId: v.id("medicines"), delta: v.number() },
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.delta) || args.delta === 0) {
      throw new Error("Stock adjustment must be a non-zero whole number.");
    }
    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine) throw new Error("Medicine not found.");
    const nextStock = medicine.stock + args.delta;
    if (nextStock < medicine.reservedQuantity) {
      throw new Error(`Stock cannot be lower than reserved quantity (${medicine.reservedQuantity}).`);
    }
    await ctx.db.patch(args.medicineId, { stock: nextStock });
    return await ctx.db.get(args.medicineId);
  },
});

/** Delete a medicine from the inventory. */
export const remove = mutation({
  args: { medicineId: v.id("medicines") },
  handler: async (ctx, args) => {
    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine) throw new Error("Medicine not found.");
    if (medicine.reservedQuantity > 0) {
      throw new Error("Cannot delete medicine with reserved stock.");
    }
    await ctx.db.delete(args.medicineId);
    return { success: true };
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
