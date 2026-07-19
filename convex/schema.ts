import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * =====================================================================
 * PHARMACY PLATFORM — CONVEX SCHEMA
 * =====================================================================
 * Roles: "customer" | "pharmacist" | "admin"
 *
 * Design notes:
 * - Money fields are stored as numbers (smallest currency unit is fine too,
 *   just be consistent). Here they're plain decimal numbers.
 * - Dates are stored as JS timestamps (v.number(), Date.now() / ms since epoch)
 *   so they sort naturally and are easy to compare for expiry logic.
 * - "Queue against a medicine" (who reserved how many units) is NOT a
 *   separate table — it's derived by querying `reservationItems` joined
 *   with `reservations` filtered by status "approved"/"ready" for a given
 *   medicineId. The `by_medicine` index on reservationItems supports this.
 * - Reservation expiry (pickup date passed) is handled by a scheduled
 *   Convex cron function that flips status -> "expired" and restores stock
 *   if it had been decremented; schema just needs the status + pickupDate.
 * - Drug-interaction warnings are produced by an external Codex API call
 *   (action, not schema) and simply stored on the reservation as a string
 *   array snapshot at reservation time.
 * =====================================================================
 */

export default defineSchema({
  // -------------------------------------------------------------------
  // USERS  (customers, pharmacists, admins)
  // -------------------------------------------------------------------
  users: defineTable({
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    role: v.union(
      v.literal("customer"),
      v.literal("pharmacist"),
      v.literal("admin")
    ),
    // Hashed password only — NEVER store plaintext. Hash with bcrypt/argon2
    // (via a Convex action, since hashing needs Node's runtime, not the
    // default Convex query/mutation runtime) before writing this field,
    // and compare with the library's verify function on login.
    // Optional because social/OAuth users won't have one.
    passwordHash: v.optional(v.string()),
    // If role === "pharmacist", which pharmacy they manage/work for.
    pharmacyId: v.optional(v.id("pharmacies")),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(), // used by admin to enable/disable an account
    authId: v.optional(v.string()), // external auth provider subject id
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_pharmacy", ["pharmacyId"]),

  // -------------------------------------------------------------------
  // PHARMACIES
  // -------------------------------------------------------------------
  pharmacies: defineTable({
    name: v.string(),
    ownerId: v.id("users"), // pharmacist account that owns/manages it
    address: v.string(),
    phone: v.string(),
    licenseNumber: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .searchIndex("search_name", { searchField: "name" }),

  // -------------------------------------------------------------------
  // MEDICINES  (pharmacy inventory)
  // -------------------------------------------------------------------
  medicines: defineTable({
    pharmacyId: v.id("pharmacies"),
    name: v.string(),
    genericName: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // symptoms this medicine is commonly used for — enables symptom search
    symptoms: v.array(v.string()),
    requiresPrescription: v.boolean(),

    // Inventory / costing
    stock: v.number(), // units currently in stock
    unitCostPrice: v.number(), // what the pharmacy paid per unit
    unitSellingPrice: v.number(), // what the customer pays per unit
    mfgDate: v.number(),
    expiryDate: v.number(),

    isActive: v.boolean(), // soft-delete / hide from search
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_pharmacy", ["pharmacyId"])
    .index("by_generic_name", ["genericName"])
    .index("by_pharmacy_and_active", ["pharmacyId", "isActive"])
    .searchIndex("search_medicine", {
      searchField: "name",
      filterFields: ["pharmacyId", "genericName", "requiresPrescription"],
    }),
  // NOTE on symptom search: Convex search indexes require a plain string
  // field, not an array, so `symptoms` isn't indexed for full-text search.
  // Query it in a normal Convex query using the `by_pharmacy` index and
  // then `.filter((q) => ...)` / manual `.includes()` on the returned
  // documents, or maintain a companion `symptomsText: v.string()` field
  // (space-joined symptoms) with its own searchIndex if you need fast
  // full-text symptom search at scale.

  // -------------------------------------------------------------------
  // FAVORITES  (customer "liked" pharmacies)
  // -------------------------------------------------------------------
  favorites: defineTable({
    customerId: v.id("users"),
    pharmacyId: v.id("pharmacies"),
    createdAt: v.number(),
  })
    .index("by_customer", ["customerId"])
    .index("by_customer_and_pharmacy", ["customerId", "pharmacyId"]),

  // -------------------------------------------------------------------
  // PRESCRIPTION VAULT
  // -------------------------------------------------------------------
  prescriptions: defineTable({
    customerId: v.id("users"),
    storageId: v.id("_storage"), // uploaded image file
    fileName: v.string(),
    notes: v.optional(v.string()),
    uploadedAt: v.number(),
  }).index("by_customer", ["customerId"]),

  // -------------------------------------------------------------------
  // RESERVATIONS  (a customer's "order" placed at one pharmacy)
  // -------------------------------------------------------------------
  reservations: defineTable({
    customerId: v.id("users"),
    pharmacyId: v.id("pharmacies"),

    status: v.union(
      v.literal("pending"), // awaiting pharmacist approval
      v.literal("approved"), // pharmacist approved, queued for pickup
      v.literal("rejected"), // pharmacist rejected
      v.literal("expired"), // pickup date passed without delivery
      v.literal("ready"), // optional intermediate: staged for pickup
      v.literal("delivered"), // picked up / delivered -> becomes order history
      v.literal("cancelled") // cancelled by customer before approval
    ),

    requestDate: v.number(),
    pickupDate: v.number(),

    // Prescription attached, required if any item in the cart needs one.
    prescriptionId: v.optional(v.id("prescriptions")),

    // Snapshot of drug-interaction warnings from the Codex API at
    // reservation time (e.g. ["Med A + Med B may interact"]).
    interactionWarnings: v.optional(v.array(v.string())),

    totalAmount: v.number(),
    invoiceNumber: v.optional(v.string()),

    // Pharmacist-facing note that gets pushed to the customer as a
    // notification (approval note, rejection reason, general update).
    pharmacistNote: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customer", ["customerId"])
    .index("by_pharmacy", ["pharmacyId"])
    .index("by_pharmacy_and_status", ["pharmacyId", "status"])
    .index("by_customer_and_status", ["customerId", "status"])
    .index("by_status_and_pickup", ["status", "pickupDate"]), // for expiry cron

  // -------------------------------------------------------------------
  // RESERVATION ITEMS  (line items / cart contents of a reservation)
  // -------------------------------------------------------------------
  reservationItems: defineTable({
    reservationId: v.id("reservations"),
    medicineId: v.id("medicines"),

    // Snapshots taken at time of reservation so historical invoices
    // stay accurate even if the medicine record later changes.
    medicineName: v.string(),
    genericName: v.string(),
    unitPrice: v.number(),
    units: v.number(),
    subtotal: v.number(),
    requiresPrescription: v.boolean(),
  })
    .index("by_reservation", ["reservationId"])
    .index("by_medicine", ["medicineId"]),

  // -------------------------------------------------------------------
  // NOTIFICATIONS
  // -------------------------------------------------------------------
  notifications: defineTable({
    userId: v.id("users"), // recipient
    type: v.union(
      v.literal("reservation_approved"),
      v.literal("reservation_rejected"),
      v.literal("pharmacist_note"),
      v.literal("order_ready"),
      v.literal("order_delivered"),
      v.literal("reservation_expired"),
      v.literal("system")
    ),
    title: v.string(),
    message: v.string(),
    sourceReservationId: v.optional(v.id("reservations")),
    sourcePharmacyId: v.optional(v.id("pharmacies")),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "read"]),

  // -------------------------------------------------------------------
  // TRANSACTIONS  (pharmacist sales & purchases/restocks)
  // -------------------------------------------------------------------
  transactions: defineTable({
    pharmacyId: v.id("pharmacies"),
    type: v.union(v.literal("sale"), v.literal("purchase")),

    medicineId: v.optional(v.id("medicines")),
    medicineName: v.optional(v.string()), // snapshot
    reservationId: v.optional(v.id("reservations")), // set for "sale" rows

    quantity: v.number(),
    unitPrice: v.number(),
    totalAmount: v.number(),

    date: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_pharmacy", ["pharmacyId"])
    .index("by_pharmacy_and_type", ["pharmacyId", "type"])
    .index("by_pharmacy_and_date", ["pharmacyId", "date"]),

  // -------------------------------------------------------------------
  // AI ASSISTANT (symptom -> medicine suggestions via Codex API)
  // -------------------------------------------------------------------
  aiConversations: defineTable({
    customerId: v.id("users"),
    title: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_customer", ["customerId"]),

  aiMessages: defineTable({
    conversationId: v.id("aiConversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),
});