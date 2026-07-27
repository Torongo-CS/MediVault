export interface Medicine {
  id: string;
  name: string;
  genericName?: string;
}

export interface InteractionRule {
  medicineAId: string;
  medicineBId: string;
  severity: "mild" | "moderate" | "severe";
  description: string;
}

export interface InteractionWarning {
  severity: "mild" | "moderate" | "severe";
  medicineA: Medicine;
  medicineB: Medicine;
  description: string;
  type: "intra-cart" | "history";
}

/**
 * Checks for drug-drug interactions between current active cart items
 * and medicines purchased in the past 7 days.
 * 
 * @param activeItems List of medicines currently in the user's cart
 * @param recentMedicines List of medicines purchased in the past 7 days
 * @param rules List of known drug-drug interaction rules
 * @returns Array of warnings representing identified drug conflicts
 */
export function checkDrugInteractions(
  activeItems: Medicine[],
  recentMedicines: Medicine[],
  rules: InteractionRule[]
): InteractionWarning[] {
  const warnings: InteractionWarning[] = [];
  
  // 1. Check intra-cart interactions (among current items)
  for (let i = 0; i < activeItems.length; i++) {
    for (let j = i + 1; j < activeItems.length; j++) {
      const itemA = activeItems[i];
      const itemB = activeItems[j];
      
      const matchingRule = rules.find(
        (rule) =>
          (rule.medicineAId === itemA.id && rule.medicineBId === itemB.id) ||
          (rule.medicineAId === itemB.id && rule.medicineBId === itemA.id)
      );
      
      if (matchingRule) {
        warnings.push({
          severity: matchingRule.severity,
          medicineA: itemA,
          medicineB: itemB,
          description: matchingRule.description,
          type: "intra-cart",
        });
      }
    }
  }
  
  // 2. Check historical interactions (between cart items and last week's orders)
  for (const activeItem of activeItems) {
    for (const historicalItem of recentMedicines) {
      // Prevent duplicate matching if same item is in cart (already checked or non-conflicting with self)
      if (activeItem.id === historicalItem.id) continue;
      
      const matchingRule = rules.find(
        (rule) =>
          (rule.medicineAId === activeItem.id && rule.medicineBId === historicalItem.id) ||
          (rule.medicineAId === historicalItem.id && rule.medicineBId === activeItem.id)
      );
      
      if (matchingRule) {
        // Prevent duplicate warnings if already flagged in intra-cart
        const isAlreadyFlagged = warnings.some(
          (w) =>
            w.type === "intra-cart" &&
            ((w.medicineA.id === activeItem.id && w.medicineB.id === historicalItem.id) ||
              (w.medicineA.id === historicalItem.id && w.medicineB.id === activeItem.id))
        );
        
        if (!isAlreadyFlagged) {
          warnings.push({
            severity: matchingRule.severity,
            medicineA: activeItem,
            medicineB: historicalItem,
            description: matchingRule.description,
            type: "history",
          });
        }
      }
    }
  }
  
  return warnings;
}
