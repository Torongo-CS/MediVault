import { v, ConvexError } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { hashPassword, normalizeEmail } from "./auth";

/**
 * Creates (or resets) the single fixed admin account.
 *
 *   bunx convex env set ADMIN_EMAIL admin@medivault.com
 *   bunx convex env set ADMIN_PASSWORD '<a strong password>'
 *   bunx convex run seed:createAdmin
 *
 * Arguments override the environment variables:
 *
 *   bunx convex run seed:createAdmin '{"email":"admin@medivault.com","password":"..."}'
 *
 * Idempotent: re-running resets the existing admin's password rather than
 * inserting a duplicate.
 */
export const createAdmin = internalAction({
  args: {
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  returns: v.object({ userId: v.id("users"), created: v.boolean() }),
  handler: async (ctx, args): Promise<{ userId: Id<"users">; created: boolean }> => {
    const email = normalizeEmail(args.email ?? process.env.ADMIN_EMAIL ?? "");
    const password = args.password ?? process.env.ADMIN_PASSWORD ?? "";
    const name = args.name ?? "MediVault Admin";

    if (email.length === 0) {
      throw new ConvexError(
        "No admin email. Pass {\"email\":\"...\"} or run: bunx convex env set ADMIN_EMAIL <email>",
      );
    }
    if (password.length < 8) {
      throw new ConvexError(
        "Admin password must be at least 8 characters. Pass {\"password\":\"...\"} or run: bunx convex env set ADMIN_PASSWORD <password>",
      );
    }

    const passwordHash = await hashPassword(password);
    return await ctx.runMutation(internal.seed.upsertAdmin, {
      name,
      email,
      passwordHash,
    });
  },
});

export const upsertAdmin = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
  },
  returns: v.object({ userId: v.id("users"), created: v.boolean() }),
  handler: async (ctx, args): Promise<{ userId: Id<"users">; created: boolean }> => {
    const existing: Doc<"users"> | null = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing !== null) {
      await ctx.db.patch("users", existing._id, {
        passwordHash: args.passwordHash,
        role: "admin",
        isActive: true,
      });
      return { userId: existing._id, created: false };
    }

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      passwordHash: args.passwordHash,
      role: "admin",
      isActive: true,
    });
    return { userId, created: true };
  },
});
