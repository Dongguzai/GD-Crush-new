import "server-only";

import {
  BadGatewayError,
  GatewayTimeoutError,
  RateLimitError,
  ServiceUnavailableError,
} from "@/lib/errors";
import { getServerEnv, isVoiceDebugEnabled } from "@/lib/env";
import { getStorageService, type StoredObject } from "@/lib/storage-service";

const DEFAULT_TTS_API_URL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";
const DEFAULT_RESOURCE_ID = "seed-tts-2.0";
const DEFAULT_SPEAKER = "zh_female_tianmeixiaoyuan_uranus_bigtts";
const REQUEST_TIMEOUT_MS = 45_000;

type ProviderChunk = {
  code?: number;
  message?: string;
  data?: string | null;
};

function log(level: "info" | "warn" | "error", message: string, data?: unknown) {
  if (!isVoiceDebugEnabled()) return;

  const timestamp = new Date().toISOString();
  const prefix = `[TTS-Service] [${timestamp}] [${level.toUpperCase()}]`;

  if (level === "error") {
    console.error(prefix, message, data);
  } else if (level === "warn") {
    console.warn(prefix, message, data);
  } else {
    console.log(prefix, message, data);
  }
}

async function fetchWithTimeout(url: string, options: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new GatewayTimeoutError("语音合成超时，请稍后再试");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapProviderError(statusCode: number, body: string) {
  if (statusCode === 401) {
    return new ServiceUnavailableError("语音服务鉴权失败，请检查服务端配置", body);
  }
  if (statusCode === 429) {
    return new RateLimitError("语音生成请求过于频繁，请稍后再试", body);
  }
  return new BadGatewayError(`语音服务返回异常（${statusCode}）`, body);
}

function parseJsonObjects(text: string): ProviderChunk[] {
  const objects: ProviderChunk[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        const raw = text.slice(start, index + 1);
        try {
          objects.push(JSON.parse(raw) as ProviderChunk);
        } catch {
          // Ignore malformed fragments; the final validation below will catch unusable responses.
        }
        start = -1;
      }
    }
  }

  return objects;
}

function decodeAudioChunks(chunks: ProviderChunk[]) {
  const binaryChunks = chunks
    .map((chunk) => chunk.data)
    .filter((chunk): chunk is string => typeof chunk === "string" && chunk.length > 0)
    .map((chunk) => Buffer.from(chunk, "base64"));

  if (!binaryChunks.length) {
    throw new BadGatewayError("语音服务未返回可用音频数据");
  }

  return Buffer.concat(binaryChunks);
}

export class TtsService {
  async synthesize(input: {
    text: string;
    category: string;
    speaker?: string | null;
  }): Promise<StoredObject> {
    const env = getServerEnv();
    if (!env.TTS_API_KEY) {
      throw new Error("TTS_API_KEY is not configured");
    }

    const apiUrl = env.TTS_API_URL ?? DEFAULT_TTS_API_URL;
    const resourceId = env.TTS_RESOURCE_ID ?? DEFAULT_RESOURCE_ID;
    const speaker = input.speaker ?? env.TTS_DEFAULT_SPEAKER ?? DEFAULT_SPEAKER;

    log("info", "Submitting TTS request", {
      speaker,
      resourceId,
      textLength: input.text.length,
    });

    const response = await fetchWithTimeout(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": env.TTS_API_KEY,
        "X-Api-Resource-Id": resourceId,
      },
      body: JSON.stringify({
        req_params: {
          text: input.text,
          speaker,
          audio_params: {
            format: "mp3",
            speech_rate: -10,
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw mapProviderError(response.status, body);
    }

    const raw = await response.text();
    const chunks = parseJsonObjects(raw);
    const terminalError = chunks.find((chunk) => chunk.code && ![0, 20_000_000].includes(chunk.code));
    if (terminalError) {
      throw new BadGatewayError(
        terminalError.message || "语音服务返回失败",
        `code=${terminalError.code}`,
      );
    }

    const bytes = decodeAudioChunks(chunks);
    log("info", "TTS audio decoded", {
      chunks: chunks.length,
      byteLength: bytes.byteLength,
    });

    return getStorageService().savePublicAsset({
      category: input.category,
      bytes,
      contentType: "audio/mpeg",
      fileNameHint: "speech.mp3",
    });
  }
}

let serviceInstance: TtsService | null = null;

export function getTtsService() {
  if (!serviceInstance) {
    serviceInstance = new TtsService();
  }

  return serviceInstance;
}
