import { describe, expect, it } from "vitest";

describe("RAG & AI Chatbot System Logic", () => {
  const mockMedicines = [
    {
      _id: "med_1",
      name: "Paracetamol 500mg",
      genericName: "Paracetamol",
      description: "Pain reliever and fever reducer for mild to moderate pain",
      symptoms: ["headache", "fever", "pain"],
      requiresPrescription: false,
      unitSellingPrice: 5.0,
      stock: 150,
      conflicts: ["Warfarin"],
    },
    {
      _id: "med_2",
      name: "Amoxicillin 250mg",
      genericName: "Amoxicillin",
      description: "Penicillin antibiotic for bacterial respiratory & throat infections",
      symptoms: ["infection", "fever"],
      requiresPrescription: true,
      unitSellingPrice: 15.0,
      stock: 45,
      conflicts: [],
    },
    {
      _id: "med_3",
      name: "Omeprazole 20mg",
      genericName: "Omeprazole",
      description: "Proton pump inhibitor for gastroesophageal reflux and acidity",
      symptoms: ["acidity", "heartburn", "gastric"],
      requiresPrescription: false,
      unitSellingPrice: 8.0,
      stock: 110,
      conflicts: [],
    },
  ];

  it("should match medicines based on symptom query", () => {
    const query = "I have high fever and severe headache";
    const matched = mockMedicines.filter((m) =>
      m.symptoms.some((s) => query.toLowerCase().includes(s))
    );

    expect(matched.length).toBeGreaterThan(0);
    expect(matched.some((m) => m.name.includes("Paracetamol"))).toBe(true);
  });

  it("should detect potential drug conflicts when warfarin is mentioned", () => {
    const query = "Can I take Paracetamol with Warfarin?";
    const conflictsDetected: string[] = [];

    mockMedicines.forEach((med) => {
      med.conflicts.forEach((conflict) => {
        if (query.toLowerCase().includes(conflict.toLowerCase())) {
          conflictsDetected.push(`Conflict: ${med.name} contraindicates with ${conflict}`);
        }
      });
    });

    expect(conflictsDetected.length).toBeGreaterThan(0);
    expect(conflictsDetected[0]).toContain("Warfarin");
  });

  it("should properly parse suggested medicines XML tags from AI response", () => {
    const rawText = `Based on your symptoms of acid reflux, I recommend Omeprazole 20mg.\n\n<suggested_medicines>\n[\n  {\n    "name": "Omeprazole 20mg",\n    "generic": "Omeprazole",\n    "rx": false,\n    "price": "$8.00"\n  }\n]\n</suggested_medicines>`;

    const match = rawText.match(/<suggested_medicines>([\s\S]*?)<\/suggested_medicines>/i);
    expect(match).not.toBeNull();

    if (match) {
      const parsed = JSON.parse(match[1].trim());
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].name).toBe("Omeprazole 20mg");
    }
  });
});
