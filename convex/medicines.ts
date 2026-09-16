import { query } from "./_generated/server";
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
