import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getServerEnv } from "@/lib/env";
import * as schema from "@/db/schema";

export function getDb() {
  const { DATABASE_URL } = getServerEnv();

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const sql = neon(DATABASE_URL);
  return drizzle(sql, { schema });
}
