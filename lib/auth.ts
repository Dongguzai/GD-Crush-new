import "server-only";

import { cookies } from "next/headers";
import { ensureDevUser } from "@/lib/dev-store";
import { hasDatabaseUrl } from "@/lib/env";

const USER_COOKIE = "gd_crush_user_id";

export async function getCurrentUserId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(USER_COOKIE)?.value;

  if (existing) {
    await ensureDevUser(existing);
    return existing;
  }

  const userId = crypto.randomUUID();
  cookieStore.set(USER_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  if (!hasDatabaseUrl()) {
    await ensureDevUser(userId);
  }

  return userId;
}
