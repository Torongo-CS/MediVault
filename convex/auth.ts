import { v, ConvexError } from "convex/values";
import {
  action,
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

/**
 * The only user shape that is ever allowed to leave the backend.
 * `passwordHash` is deliberately absent.
 */
export const publicUser = v.object({
  _id: v.id("users"),
  name: v.string(),
  email: v.string(),
  role: v.union(v.literal("admin"), v.literal("pharmacist"), v.literal("customer")),
  imageUrl: v.optional(v.string()),
  isActive: v.boolean(),
});

export type PublicUser = {
  _id: Id<"users">;
  name: string;
  email: string;
  role: "admin" | "pharmacist" | "customer";
  imageUrl?: string;
  isActive: boolean;
};

const authResult = v.object({
  token: v.string(),
  expiresAt: v.number(),
  user: publicUser,
});

type AuthResult = { token: string; expiresAt: number; user: PublicUser };

/** Public signup may only ever create these roles. Admins come from `seed.ts`. */
const signUpRole = v.union(v.literal("customer"), v.literal("pharmacist"));

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

function toPublicUser(user: Doc<"users">): PublicUser {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    imageUrl: user.imageUrl,
    isActive: user.isActive,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Password hashing (Web Crypto PBKDF2-SHA256)
// ---------------------------------------------------------------------------

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

// The explicit `<ArrayBuffer>` matters: a bare `Uint8Array` is backed by
// `ArrayBufferLike`, which crypto.subtle's `BufferSource` will not accept.
function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

/** Produces `pbkdf2$<iterations>$<saltB64>$<hashB64>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Compares two equal-length byte arrays without early-exit timing leaks. */
function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  try {
    const salt = fromBase64(parts[2]);
    const expected = fromBase64(parts[3]);
    const actual = await derive(password, salt, iterations);
    return constantTimeEquals(actual, expected);
  } catch {
    // Malformed base64 in a stored hash must read as "wrong password", not a crash.
    return false;
  }
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Internal database helpers
// ---------------------------------------------------------------------------

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<Doc<"users"> | null> => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const createUser = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    role: v.union(v.literal("admin"), v.literal("pharmacist"), v.literal("customer")),
  },
  returns: v.id("users"),
  handler: async (ctx, args): Promise<Id<"users">> => {
    // The action's earlier lookup is not part of this transaction, so two
    // concurrent signups could both have seen "email free". Re-check here.
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (existing !== null) {
      throw new ConvexError({ code: "EMAIL_TAKEN" });
    }

    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      passwordHash: args.passwordHash,
      role: args.role,
      isActive: true,
    });
  },
});

export const createSession = internalMutation({
  args: { userId: v.id("users") },
  returns: v.object({ token: v.string(), expiresAt: v.number(), user: publicUser }),
  handler: async (ctx, args): Promise<AuthResult> => {
    const user = await ctx.db.get("users", args.userId);
    if (user === null) {
      throw new ConvexError({ code: "INVALID_CREDENTIALS" });
    }

    const now = Date.now();
    const token = newToken();
    const expiresAt = now + SESSION_DURATION_MS;

    await ctx.db.insert("sessions", {
      token,
      userId: args.userId,
      expiresAt,
      createdAt: now,
    });

    return { token, expiresAt, user: toPublicUser(user) };
  },
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const signUp = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    // Note the narrow validator: there is no way to self-register as an admin.
    role: signUpRole,
  },
  returns: authResult,
  handler: async (ctx, args): Promise<AuthResult> => {
    const name = args.name.trim();
    const email = normalizeEmail(args.email);

    if (name.length === 0) throw new ConvexError({ code: "NAME_REQUIRED" });
    if (args.password.length < 8) throw new ConvexError({ code: "PASSWORD_TOO_SHORT" });

    const existing: Doc<"users"> | null = await ctx.runQuery(
      internal.auth.getUserByEmail,
      { email },
    );
    if (existing !== null) {
      throw new ConvexError({ code: "EMAIL_TAKEN" });
    }

    const passwordHash = await hashPassword(args.password);
    const userId: Id<"users"> = await ctx.runMutation(internal.auth.createUser, {
      name,
      email,
      passwordHash,
      role: args.role,
    });

    return await ctx.runMutation(internal.auth.createSession, { userId });
  },
});

export const signIn = action({
  args: { email: v.string(), password: v.string() },
  returns: authResult,
  handler: async (ctx, args): Promise<AuthResult> => {
    const email = normalizeEmail(args.email);
    const user: Doc<"users"> | null = await ctx.runQuery(
      internal.auth.getUserByEmail,
      { email },
    );

    // Unknown email and wrong password must be indistinguishable to the caller,
    // otherwise this endpoint enumerates accounts. Still run a hash on the
    // unknown-email path so the two branches take comparable time.
    if (user === null) {
      await verifyPassword(args.password, `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(
        new Uint8Array(SALT_BYTES),
      )}$${toBase64(new Uint8Array(KEY_BITS / 8))}`);
      throw new ConvexError({ code: "INVALID_CREDENTIALS" });
    }

    const ok = await verifyPassword(args.password, user.passwordHash);
    if (!ok) {
      throw new ConvexError({ code: "INVALID_CREDENTIALS" });
    }

    if (!user.isActive) {
      throw new ConvexError({ code: "ACCOUNT_INACTIVE" });
    }

    return await ctx.runMutation(internal.auth.createSession, { userId: user._id });
  },
});

/** Called on every server request from `src/hooks.server.ts`. */
export const getSession = query({
  args: { token: v.string() },
  returns: v.union(publicUser, v.null()),
  handler: async (ctx, args): Promise<PublicUser | null> => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (session === null || session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get("users", session.userId);
    if (user === null || !user.isActive) return null;

    return toPublicUser(user);
  },
});

export const signOut = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (session !== null) {
      await ctx.db.delete("sessions", session._id);
    }
    return null;
  },
});
