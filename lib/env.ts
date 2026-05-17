import "server-only";

import { z } from "zod";

function emptyStringToUndefined(value: unknown) {
  return value === "" ? undefined : value;
}

const serverEnvSchema = z.object({
  DATABASE_URL: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  NEXT_PUBLIC_APP_URL: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  DEEPSEEK_API_KEY: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  APIMART_API_KEY: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  AI_DEBUG: z.preprocess(
    emptyStringToUndefined,
    z.enum(["0", "1", "false", "true"]).optional(),
  ),
  IMAGE_DEBUG: z.preprocess(
    emptyStringToUndefined,
    z.enum(["0", "1", "false", "true"]).optional(),
  ),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    APIMART_API_KEY: process.env.APIMART_API_KEY,
    AI_DEBUG: process.env.AI_DEBUG,
    IMAGE_DEBUG: process.env.IMAGE_DEBUG,
  });
}

export function hasDatabaseUrl() {
  return Boolean(getServerEnv().DATABASE_URL);
}

export function isAiDebugEnabled() {
  const val = getServerEnv().AI_DEBUG;
  return val === "1" || val === "true";
}

export function isImageDebugEnabled() {
  const val = getServerEnv().IMAGE_DEBUG;
  return val === "1" || val === "true";
}
