import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. USERS TABLE (Admins, Pharmacists, Customers)
  users: defineTable({
    role: v.union(v.literal("admin"), v.literal("pharmacist"), v.literal("customer")),
    email: v.string(),
    passwordHash: v.string(),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
  })
  .index("by_email", ["email"])
  .index("by_role", ["role"]),

  // 2. MEDICINE TABLE
  medicines: defineTable({
    name: v.string(),
    genericName: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    symptoms: v.array(v.string()),
    requiresPrescription: v.boolean(),
    stock: v.number(), // Total physical inventory on hand
    reservedQuantity: v.number(), // Units locked in pending/approved reservations
    unitCostingPrice: v.number(),
    unitSellingPrice: v.number(),
    expiryDate: v.number(), // Unix timestamp (ms)
    conflicts: v.array(v.string()), // List of conflicting generic names
  })
  .index("by_genericName", ["genericName"]),

  // 3. RESERVATION TABLE (Submitted orders awaiting pickup)
  reservations: defineTable({
    customerId: v.id("users"),
    pharmacistId: v.optional(v.id("users")), // Claimed by pharmacist during fulfillment
    medsList: v.array(
      v.object({
        medicineId: v.id("medicines"),
        quantity: v.number(),
      })
    ),
    totalUnitsRequested: v.number(),
    totalCosting: v.number(),
    createdAt: v.number(), // System tracking timestamp
    pickupDate: v.number(), // Hard boundary timestamp for order collection
    prescriptionImageUrl: v.optional(v.string()), // Uploaded directly during the checkout flow
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  })
  .index("by_customer", ["customerId"]) // Drives customer Order History queries
  .index("by_pharmacist", ["pharmacistId"])
  .index("by_status", ["status"])
  .index("by_pickupDate", ["pickupDate"]), // Efficient indexing for cron cleanups

  // 4. PRESCRIPTIONS TABLE (Customer document vault for personal safekeeping)
  prescriptions: defineTable({
    name: v.string(),
    dateUploaded: v.number(),
    imageUrl: v.string(),
    userId: v.id("users"),
  })
  .index("by_user", ["userId"]),

  // 5. FAVORITES TABLE (Customers saving preferred pharmacists)
  favorites: defineTable({
    customerId: v.id("users"), 
    pharmacistId: v.id("users"), 
  })
  .index("by_customer", ["customerId"]),

  // 6. COMPLAINT TICKETS (The parent ticket thread)
  complaintTickets: defineTable({
    creatorId: v.id("users"), // Customer or Pharmacist filing the complaint
    title: v.string(),
    status: v.union(v.literal("open"), v.literal("resolved")),
    createdAt: v.number(),
    updatedAt: v.number(), // Allows admin panel to sort by the thread with the newest reply
  })
  .index("by_creator", ["creatorId"])
  .index("by_status", ["status"])
  .index("by_updatedAt", ["updatedAt"]),

  // 7. COMPLAINT MESSAGES (The back-and-forth chat history inside a ticket)
  complaintMessages: defineTable({
    ticketId: v.id("complaintTickets"),
    senderId: v.id("users"), 
    message: v.string(),
    timestamp: v.number(),
  })
  .index("by_ticket", ["ticketId"]),

  // 8. NOTIFICATION TABLE (One-way operational pings from pharmacist to customer)
  notifications: defineTable({
    senderId: v.id("users"), 
    receiverId: v.id("users"), 
    message: v.string(),
    isRead: v.boolean(),
    timestamp: v.number(),
  })
  .index("by_receiver", ["receiverId"]),

  // 9. TRANSACTION RECORD TABLE (Generated when order status changes to "completed")
  transactionRecords: defineTable({
    reservationId: v.id("reservations"),
    completedAt: v.number(),
    itemsSnapshot: v.array(
      v.object({
        medicineId: v.id("medicines"),
        quantity: v.number(),
        unitCostingPriceAtSale: v.number(), // Avoids breaking financial logs if master items change price
        unitSellingPriceAtSale: v.number(),
      })
    ),
    totalRevenue: v.number(),
  })
  .index("by_reservation", ["reservationId"]),
});