import { existsSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

console.log("\n=======================================================");
console.log("             Setting up MediVault Database              ");
console.log("=======================================================\n");

// 1. Environment file setup
if (!existsSync(".env.local")) {
  console.log("-> Creating .env.local with default Convex configuration...");
  const envContent = `PUBLIC_CONVEX_URL="https://polite-kudu-186.convex.cloud"\nCONVEX_DEPLOYMENT="dev:polite-kudu-186"\n`;
  writeFileSync(".env.local", envContent, "utf-8");
} else {
  console.log("-> .env.local exists.");
}

// 2. Install dependencies
console.log("\n-> Installing dependencies with Bun...");
try {
  execSync("bun install", { stdio: "inherit" });
} catch (e) {
  console.log("Failed to run bun install:", e);
}

// 3. Deploy Convex functions & generate TypeScript bindings
console.log("\n-> Deploying Convex functions to cloud & generating bindings...");
try {
  execSync("bunx convex dev --once", { stdio: "inherit" });
} catch (e) {
  console.log("Convex dev failed:", e);
}

// 4. Seed database with discrete pharmacy test accounts & unique inventories
console.log("\n-> Seeding Convex database from dummyData.json...");
try {
  execSync("bun run seed", { stdio: "inherit" });
} catch (e) {
  console.log("Seed failed:", e);
}

console.log("\n=======================================================");
console.log(" 🎉 SETUP COMPLETE!");
console.log("=======================================================");
console.log("\nSeeded Teammates Test Accounts (Password: password123):\n");
console.log(" 🏥 DISCRETE PHARMACY STORES:");
console.log("   1. HealthPlus Pharmacy    -> pharmacist@medivault.com");
console.log("   2. CarePoint Medical Store -> carepoint@medivault.com");
console.log("   3. MediCare Family Store  -> medicare@medivault.com");
console.log("   4. Green Cross Dispensary  -> greencross@medivault.com");
console.log("   5. Lazz Pharma Motijheel   -> lazzpharma@medivault.com\n");
console.log(" 👤 CUSTOMER ACCOUNT:       -> customer@medivault.com");
console.log(" 🛡️ ADMIN ACCOUNT:          -> admin@medivault.com\n");
console.log("=======================================================");
console.log(" To start the application, run:");
console.log("   bun run dev\n");
