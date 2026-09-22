import { query } from "./_generated/server";
import { v } from "convex/values";

export interface RetrievedMedicine {
  _id: string;
  name: string;
  genericName: string;
  description: string;
  symptoms: string[];
  requiresPrescription: boolean;
  unitSellingPrice: number;
  stock: number;
  conflicts: string[];
  relevanceScore: number;
}

/**
 * RAG Knowledge Base Retriever Query:
 * Searches the Convex `medicines` database for clinical symptoms, generic names,
 * descriptions, price tags, and drug interaction conflicts.
 */
export const searchMedicineKnowledgeBase = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const rawQuery = args.query.trim().toLowerCase();
    if (!rawQuery) {
      return { medicines: [], conflictAlerts: [], ragContextText: "" };
    }

    const allMedicines = await ctx.db.query("medicines").collect();
    const words = rawQuery.split(/\s+/).filter((w) => w.length > 2);

    const scoredMedicines: RetrievedMedicine[] = [];
    const detectedConflicts: string[] = [];

    for (const med of allMedicines) {
      let score = 0;
      const medName = med.name.toLowerCase();
      const generic = med.genericName.toLowerCase();
      const desc = med.description.toLowerCase();
      const symptomsList = med.symptoms.map((s) => s.toLowerCase());
      const conflictsList = med.conflicts.map((c) => c.toLowerCase());

      // Symptom exact & partial matching (High weight)
      for (const symptom of symptomsList) {
        if (rawQuery.includes(symptom)) {
          score += 10;
        } else {
          for (const word of words) {
            if (symptom.includes(word) || word.includes(symptom)) {
              score += 5;
            }
          }
        }
      }

      // Generic name matching
      if (rawQuery.includes(generic)) {
        score += 15;
      }

      // Medicine brand name matching
      if (rawQuery.includes(medName)) {
        score += 12;
      }

      // Description keyword matching
      for (const word of words) {
        if (desc.includes(word)) {
          score += 2;
        }
      }

      // Check conflict warnings
      for (const conflict of conflictsList) {
        if (rawQuery.includes(conflict)) {
          detectedConflicts.push(
            `⚠️ Potential Conflict Warning: ${med.name} (${med.genericName}) has known contraindications with ${conflict}.`
          );
        }
      }

      if (score > 0) {
        scoredMedicines.push({
          _id: med._id,
          name: med.name,
          genericName: med.genericName,
          description: med.description,
          symptoms: med.symptoms,
          requiresPrescription: med.requiresPrescription,
          unitSellingPrice: med.unitSellingPrice,
          stock: med.stock,
          conflicts: med.conflicts,
          relevanceScore: score,
        });
      }
    }

    // Sort by highest relevance score
    scoredMedicines.sort((a, b) => b.relevanceScore - a.relevanceScore);
    let topMatches = scoredMedicines.slice(0, 5);

    // Fallback: If no medicines matched the query keywords, include default top catalog items
    if (topMatches.length === 0) {
      topMatches = allMedicines.slice(0, 4).map((m) => ({
        _id: m._id,
        name: m.name,
        genericName: m.genericName,
        description: m.description,
        symptoms: m.symptoms,
        requiresPrescription: m.requiresPrescription,
        unitSellingPrice: m.unitSellingPrice,
        stock: m.stock,
        conflicts: m.conflicts,
        relevanceScore: 1,
      }));
    }

    // Format RAG Context String for LLM Injection
    let ragContextText = "";
    if (topMatches.length > 0) {
      ragContextText = "RETRIEVED CLINICAL KNOWLEDGE BASE (MEDIVAULT CATALOG RAG CONTEXT):\n";
      topMatches.forEach((m, idx) => {
        ragContextText += `${idx + 1}. Medicine Name: ${m.name}\n`;
        ragContextText += `   Generic Name: ${m.genericName}\n`;
        ragContextText += `   Indicated Symptoms: ${m.symptoms.join(", ")}\n`;
        ragContextText += `   Prescription Required (Rx): ${m.requiresPrescription ? "Yes (Rx Required)" : "No (OTC)"}\n`;
        ragContextText += `   Selling Price: $${m.unitSellingPrice.toFixed(2)}\n`;
        ragContextText += `   Stock Level: ${m.stock} units\n`;
        if (m.conflicts.length > 0) {
          ragContextText += `   Known Drug Conflicts: ${m.conflicts.join(", ")}\n`;
        }
        ragContextText += `   Clinical Description: ${m.description}\n\n`;
      });
    }

    return {
      medicines: topMatches,
      conflictAlerts: Array.from(new Set(detectedConflicts)),
      ragContextText,
    };
  },
});
