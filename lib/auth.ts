/**
 * M6.5: Authentication Service
 *
 * Supports both anonymous (cookie-based) and authenticated (email/password) modes.
 * Anonymous users can migrate to authenticated accounts without losing data.
 *
 * Auth Modes:
 * - anonymous: Cookie-based, no account, data tied to browser
 * - authenticated: Email/password, data tied to account, cross-device
 *
 * Security:
 * - Passwords hashed with scrypt
 * - Sessions stored server-side (DB or dev-store)
 * - CSRF protection via SameSite cookies
 */

import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { eq, and, isNull, gt } from "drizzle-orm";
import { hasDatabaseUrl } from "@/lib/env";
import { getDb } from "@/lib/db";
import { users, authSessions } from "@/db/schema";
import {
  ensureDevUser,
  getDevSessionById,
  revokeDevSession,
  registerDevUser,
  loginDevUser,
  isDevSessionValid,
  getDevUserEmail,
} from "@/lib/dev-store";

const USER_COOKIE = "gd_crush_user_id";
const SESSION_COOKIE = "gd_session_id";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const scryptAsync = promisify(scrypt);

/**
 * Get current user ID (supports both anonymous and authenticated)
 * Priority: Valid DB/dev session > Anonymous cookie
 */
export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();

  // Check for authenticated session first
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    // Try DB first
    if (hasDatabaseUrl()) {
      const userId = await getDbUserIdFromSession(sessionId);
      if (userId) {
        // Update last seen
        await updateSessionLastSeen(sessionId);
        return userId;
      }
    } else {
      // Fall back to dev-store
      const session = getDevSessionById(sessionId);
      if (session && isDevSessionValid(session)) {
        return session.userId;
      }
    }
  }

  // Fall back to anonymous cookie
  const anonymousId = cookieStore.get(USER_COOKIE)?.value;
  if (anonymousId) {
    if (!hasDatabaseUrl()) {
      await ensureDevUser(anonymousId);
    }
    return anonymousId;
  }

  return null;
}

/**
 * Get current user ID, creating anonymous if not exists
 */
export async function getOrCreateUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (userId) {
    return userId;
  }

  // Create new anonymous user
  const cookieStore = await cookies();
  const newUserId = crypto.randomUUID();

  cookieStore.set(USER_COOKIE, newUserId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  if (!hasDatabaseUrl()) {
    await ensureDevUser(newUserId);
  } else {
    // Create user in DB for DB mode
    const db = getDb();
    await db.insert(users).values({ id: newUserId });
  }

  return newUserId;
}

/**
 * Check if current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    return false;
  }

  if (hasDatabaseUrl()) {
    return Boolean(await getDbUserIdFromSession(sessionId));
  } else {
    const session = getDevSessionById(sessionId);
    return Boolean(session && isDevSessionValid(session));
  }
}

/**
 * Get current user email (if authenticated)
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    return null;
  }

  if (hasDatabaseUrl()) {
    const db = getDb();
    const now = new Date();

    const [session] = await db
      .select({ email: users.email })
      .from(authSessions)
      .innerJoin(users, eq(authSessions.userId, users.id))
      .where(
        and(
          eq(authSessions.id, sessionId),
          gt(authSessions.expiresAt, now),
          isNull(authSessions.revokedAt)
        )
      )
      .limit(1);

    return session?.email ?? null;
  } else {
    return getDevUserEmail(sessionId);
  }
}

/**
 * Register new user with email and password.
 * This upgrades the current anonymous user to an authenticated user.
 *
 * If currentUserId is provided, that user will be upgraded in-place.
 * Otherwise, a new user is created.
 */
export async function registerUser(
  email: string,
  password: string,
  currentUserId?: string | null
): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Invalid email format" };
  }

  // Validate password strength
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  if (hasDatabaseUrl()) {
    const db = getDb();

    // Check if email already exists
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      return { success: false, error: "Email already registered" };
    }

    // Determine which user to upgrade
    let targetUserId = currentUserId;

    if (!targetUserId) {
      // No current user, create new user
      targetUserId = crypto.randomUUID();
      await db.insert(users).values({ id: targetUserId });
    }

    // Upgrade the user with email/password
    await db
      .update(users)
      .set({
        email: normalizedEmail,
        passwordHash,
        emailVerifiedAt: null, // Could implement email verification later
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUserId));

    // Create session
    const sessionId = await createDbSession(targetUserId);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return { success: true, userId: targetUserId };
  } else {
    // Dev-store mode - pass plain password (dev-store stores it as-is for simplicity)
    const result = await registerDevUser(normalizedEmail, password, currentUserId);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Set session cookie for dev-store mode
    if (result.sessionId) {
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE, result.sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE,
      });
    }

    return { success: true, userId: result.userId };
  }
}

/**
 * Login with email and password
 */
export async function loginUser(email: string, password: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Invalid email format" };
  }

  if (password.length < 1) {
    return { success: false, error: "Password required" };
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (hasDatabaseUrl()) {
    const db = getDb();

    // Find user by email
    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user || !user.passwordHash) {
      return { success: false, error: "Invalid email or password" };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return { success: false, error: "Invalid email or password" };
    }

    // Create session
    const sessionId = await createDbSession(user.id);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return { success: true };
  } else {
    // Dev-store mode
    const result = await loginDevUser(normalizedEmail, password);
    if (!result.success) {
      return result;
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, result.sessionId!, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return { success: true };
  }
}

/**
 * Logout current user
 */
export async function logoutUser(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    if (hasDatabaseUrl()) {
      const db = getDb();
      await db
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(eq(authSessions.id, sessionId));
    } else {
      revokeDevSession(sessionId);
    }
    cookieStore.delete(SESSION_COOKIE);
  }
}

/**
 * Migrate anonymous user data to authenticated account.
 *
 * NOTE: This function is kept for API compatibility but the actual migration
 * happens in-place during registration. When an anonymous user registers,
 * we upgrade their existing user record with email/password instead of creating
 * a new user and transferring data.
 *
 * This approach preserves all foreign-key relationships without needing
 * to update any references.
 */
export async function migrateAnonymousToAuthenticated(
  _anonymousUserId: string,
  _authenticatedUserId: string,
): Promise<void> {
  // No-op: Migration now happens in-place during registerUser()
  // The registerUser() function upgrades the existing anonymous user
  // instead of creating a new user and transferring data.
  //
  // This is documented here for clarity and to preserve API compatibility.
}

/**
 * Verify password hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [scheme, salt, key] = hash.split(":");
  if (scheme !== "scrypt" || !salt || !key) {
    return false;
  }

  const storedKey = Buffer.from(key, "hex");
  const derivedKey = (await scryptAsync(password, salt, storedKey.length)) as Buffer;
  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

// ============ Database Helpers ============

async function getDbUserIdFromSession(sessionId: string): Promise<string | null> {
  const db = getDb();
  const now = new Date();

  const [session] = await db
    .select({ userId: authSessions.userId })
    .from(authSessions)
    .where(
      and(
        eq(authSessions.id, sessionId),
        gt(authSessions.expiresAt, now),
        isNull(authSessions.revokedAt)
      )
    )
    .limit(1);

  return session?.userId ?? null;
}

async function createDbSession(userId: string): Promise<string> {
  const db = getDb();
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE * 1000);

  await db.insert(authSessions).values({
    id: sessionId,
    userId,
    expiresAt,
    createdAt: now,
    lastSeenAt: now,
  });

  return sessionId;
}

async function updateSessionLastSeen(sessionId: string): Promise<void> {
  const db = getDb();
  await db
    .update(authSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(authSessions.id, sessionId));
}