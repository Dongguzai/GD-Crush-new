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
  ARK_API_KEY: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  R2_ACCESS_KEY_ID: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  R2_SECRET_ACCESS_KEY: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  R2_ENDPOINT: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  R2_BUCKET_NAME: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  R2_PUBLIC_BASE_URL: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  TTS_API_KEY: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  TTS_API_URL: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  TTS_RESOURCE_ID: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  TTS_DEFAULT_SPEAKER: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  STT_API_KEY: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  STT_API_URL: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  STT_RESOURCE_ID: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  AI_DEBUG: z.preprocess(
    emptyStringToUndefined,
    z.enum(["0", "1", "false", "true"]).optional(),
  ),
  IMAGE_DEBUG: z.preprocess(
    emptyStringToUndefined,
    z.enum(["0", "1", "false", "true"]).optional(),
  ),
  VISION_DEBUG: z.preprocess(
    emptyStringToUndefined,
    z.enum(["0", "1", "false", "true"]).optional(),
  ),
  VOICE_DEBUG: z.preprocess(
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
    ARK_API_KEY: process.env.ARK_API_KEY,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_ENDPOINT: process.env.R2_ENDPOINT,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
    TTS_API_KEY: process.env.TTS_API_KEY,
    TTS_API_URL: process.env.TTS_API_URL,
    TTS_RESOURCE_ID: process.env.TTS_RESOURCE_ID,
    TTS_DEFAULT_SPEAKER: process.env.TTS_DEFAULT_SPEAKER,
    STT_API_KEY: process.env.STT_API_KEY,
    STT_API_URL: process.env.STT_API_URL,
    STT_RESOURCE_ID: process.env.STT_RESOURCE_ID,
    AI_DEBUG: process.env.AI_DEBUG,
    IMAGE_DEBUG: process.env.IMAGE_DEBUG,
    VISION_DEBUG: process.env.VISION_DEBUG,
    VOICE_DEBUG: process.env.VOICE_DEBUG,
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

export function isVisionDebugEnabled() {
  const val = getServerEnv().VISION_DEBUG;
  return val === "1" || val === "true";
}

export function isVoiceDebugEnabled() {
  const val = getServerEnv().VOICE_DEBUG;
  return val === "1" || val === "true";
}

export function hasR2Config() {
  const env = getServerEnv();
  return Boolean(
    env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_ENDPOINT &&
      env.R2_BUCKET_NAME &&
      env.R2_PUBLIC_BASE_URL,
  );
}
