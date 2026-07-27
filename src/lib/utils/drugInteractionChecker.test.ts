import { describe, it, expect } from "vitest";
import { checkDrugInteractions, type Medicine, type InteractionRule } from "./drugInteractionChecker";

describe("Drug Interaction Checker Test Suite", () => {
  // Test inventory medicines
  const medicineA: Medicine = { id: "med_1", name: "Aspirin" };
  const medicineB: Medicine = { id: "med_2", name: "Ibuprofen" };
  const medicineC: Medicine = { id: "med_3", name: "Warfarin" };
  const medicineD: Medicine = { id: "med_4", name: "Amoxicillin" };

  // Rule: Aspirin + Warfarin = Severe Interaction (increased bleeding risk)
  // Rule: Ibuprofen + Warfarin = Moderate Interaction
  const rules: InteractionRule[] = [
    {
      medicineAId: "med_1",
      medicineBId: "med_3",
      severity: "severe",
      description: "Aspirin and Warfarin co-administration significantly increases the risk of bleeding.",
    },
    {
      medicineAId: "med_2",
      medicineBId: "med_3",
      severity: "moderate",
      description: "Ibuprofen may enhance the anticoagulant effect of Warfarin.",
    },
  ];

  it("should return no warnings when no interacting medicines are in the cart", () => {
    const cart = [medicineA, medicineB, medicineD];
    const history: Medicine[] = [];
    const warnings = checkDrugInteractions(cart, history, rules);
    expect(warnings).toHaveLength(0);
  });

  it("should detect intra-cart interactions when conflicting items are added together", () => {
    const cart = [medicineA, medicineC, medicineD]; // Aspirin (med_1) + Warfarin (med_3)
    const history: Medicine[] = [];
    const warnings = checkDrugInteractions(cart, history, rules);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe("intra-cart");
    expect(warnings[0].severity).toBe("severe");
    expect(warnings[0].medicineA.id).toBe("med_1");
    expect(warnings[0].medicineB.id).toBe("med_3");
  });

  it("should detect interaction conflicts between cart and 7-day order history", () => {
    const cart = [medicineA]; // Aspirin (med_1)
    const history = [medicineC]; // Warfarin (med_3)
    const warnings = checkDrugInteractions(cart, history, rules);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe("history");
    expect(warnings[0].severity).toBe("severe");
    expect(warnings[0].medicineA.id).toBe("med_1");
    expect(warnings[0].medicineB.id).toBe("med_3");
  });

  it("should not flag self-interactions if the same drug is in the cart and order history", () => {
    const cart = [medicineA];
    const history = [medicineA];
    const warnings = checkDrugInteractions(cart, history, rules);
    expect(warnings).toHaveLength(0);
  });

  it("should prioritize intra-cart warning over historical check if both are triggered to avoid duplicate flags", () => {
    const cart = [medicineA, medicineC]; // Aspirin + Warfarin (intra-cart)
    const history = [medicineC]; // Warfarin (already in cart)
    const warnings = checkDrugInteractions(cart, history, rules);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe("intra-cart");
  });
});
