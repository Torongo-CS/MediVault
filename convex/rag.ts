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
  matchedReason?: string;
}

// Symptom synonym mapping to map common natural language terms to canonical symptoms
const SYMPTOM_SYNONYMS: Record<string, string[]> = {
  fever: ["temperature", "pyrexia", "chills", "high temp", "warm", "feverish"],
  headache: ["migraine", "head pain", "throbbing head", "head ache"],
  pain: ["ache", "soreness", "discomfort", "cramps", "body ache", "joint pain", "muscle pain"],
  acidity: ["acid reflux", "heartburn", "gastric", "indigestion", "gas", "stomach acid", "ulcer"],
  cough: ["cold", "flu", "sore throat", "runny nose", "congestion", "phlegm", "bronchitis"],
  infection: ["bacterial", "microbial", "septic", "wound", "throat infection", "ear infection"],
  diarrhea: ["stomach infection", "loose motion", "dysentery", "upset stomach", "stomach cramp"],
  "high cholesterol": ["lipid", "triglycerides", "fatty blood", "cholesterol"],
  "heart condition": ["cardiac", "blood clot", "hypertension", "high blood pressure", "chest discomfort"],
  inflammation: ["swelling", "edema", "joint inflammation", "arthritis", "stiffness"],
};

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

    // Expand query with synonyms
    const expandedTerms = new Set<string>(words);
    expandedTerms.add(rawQuery);

    for (const [canonicalSymptom, synonyms] of Object.entries(SYMPTOM_SYNONYMS)) {
      if (rawQuery.includes(canonicalSymptom)) {
        synonyms.forEach((s) => expandedTerms.add(s));
      } else {
        for (const syn of synonyms) {
          if (rawQuery.includes(syn)) {
            expandedTerms.add(canonicalSymptom);
            expandedTerms.add(syn);
          }
        }
      }
    }

    for (const med of allMedicines) {
      let score = 0;
      const matchedReasons: string[] = [];
      const medName = med.name.toLowerCase();
      const generic = med.genericName.toLowerCase();
      const desc = med.description.toLowerCase();
      const symptomsList = med.symptoms.map((s) => s.toLowerCase());
      const conflictsList = med.conflicts.map((c) => c.toLowerCase());

      // 1. Direct Generic / Brand Name Matching (Highest Priority)
      if (rawQuery.includes(generic)) {
        score += 25;
        matchedReasons.push(`Exact generic match: ${med.genericName}`);
      } else {
        for (const word of words) {
          if (generic.includes(word) && word.length > 3) {
            score += 12;
            matchedReasons.push(`Generic keyword: ${word}`);
          }
        }
      }

      if (rawQuery.includes(medName)) {
        score += 20;
        matchedReasons.push(`Exact brand match: ${med.name}`);
      } else {
        for (const word of words) {
          if (medName.includes(word) && word.length > 3) {
            score += 10;
            matchedReasons.push(`Brand keyword: ${word}`);
          }
        }
      }

      // 2. Symptom matching with synonym expansion
      for (const symptom of symptomsList) {
        if (rawQuery.includes(symptom)) {
          score += 20;
          matchedReasons.push(`Direct symptom match: ${symptom}`);
        } else {
          for (const term of expandedTerms) {
            if (symptom.includes(term) || term.includes(symptom)) {
              score += 10;
              matchedReasons.push(`Symptom relevance: ${symptom}`);
              break;
            }
          }
        }
      }

      // 3. Description text matching
      for (const word of words) {
        if (desc.includes(word) && word.length > 3) {
          score += 4;
        }
      }

      // 4. Drug conflict detection
      for (const conflict of conflictsList) {
        if (rawQuery.includes(conflict)) {
          detectedConflicts.push(
            `⚠️ Potential Contraindication Warning: ${med.name} (${med.genericName}) has documented interaction conflicts with ${conflict}.`
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
          matchedReason: Array.from(new Set(matchedReasons)).join(", "),
        });
      }
    }

    // Sort by highest relevance score
    scoredMedicines.sort((a, b) => b.relevanceScore - a.relevanceScore);
    let topMatches = scoredMedicines.slice(0, 6);

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
        matchedReason: "Default catalog fallback",
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
        ragContextText += `   Stock Level: ${m.stock} units available\n`;
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

