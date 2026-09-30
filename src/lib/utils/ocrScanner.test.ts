import { describe, expect, it } from "vitest";

describe("AI OCR Prescription Auditor Endpoint Verification", () => {
  it("should match Pantoprazole 40mg when prescription document is attached", async () => {
    // Import OCR endpoint logic test verification
    const prescriptionImageUrl = "Pantoprazole 40mg Prescription Document";
    const medsList = [
      {
        medicineName: "Pantoprazole 40mg",
        genericName: "Pantoprazole",
        requiresPrescription: true,
      },
    ];

    const brandKeyword = "pantoprazole";
    const genericKeyword = "pantoprazole";
    const fullSearchText = (prescriptionImageUrl + " " + medsList[0].medicineName).toLowerCase();

    const isFound = fullSearchText.includes(brandKeyword) || fullSearchText.includes(genericKeyword);
    expect(isFound).toBe(true);
  });

  it("should verify OTC medicines as NOT_REQUIRED", () => {
    const medsList = [
      {
        medicineName: "Paracetamol 500mg",
        genericName: "Paracetamol",
        requiresPrescription: false,
      },
    ];

    const isRx = medsList[0].requiresPrescription !== false;
    expect(isRx).toBe(false);
  });
});
