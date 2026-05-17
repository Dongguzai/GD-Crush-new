import "server-only";

import {
  BadGatewayError,
  GatewayTimeoutError,
  RateLimitError,
  ServiceUnavailableError,
} from "@/lib/errors";
import { getServerEnv, isVisionDebugEnabled } from "@/lib/env";
import { getStorageService } from "@/lib/storage-service";

const DEFAULT_ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/responses";
const MODEL = "doubao-seed-2-0-pro-260215";
const REQUEST_TIMEOUT_MS = 30_000;

export type VisualTags = {
  hairStyle: string;
  hairColor: string;
  outfitMood: string;
  overallVibe: string;
  expressionMood: string;
  ageImpressionRange: string;
  unsafeOrSensitiveElements: string[];
  hasPerson: boolean;
  notes?: string;
};

type ArkResponse = {
  output?: Array<{
    type?: string;
    role?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

const MOCK_VISUAL_TAGS: VisualTags = {
  hairStyle: "柔和短发",
  hairColor: "深棕",
  outfitMood: "清爽、干净、轻校园感",
  overallVibe: "温柔但不黏人",
  expressionMood: "平静、稍微害羞",
  ageImpressionRange: "青年",
  unsafeOrSensitiveElements: [],
  hasPerson: true,
};

function log(level: "info" | "warn" | "error", message: string, data?: unknown) {
  if (!isVisionDebugEnabled()) return;

  const timestamp = new Date().toISOString();
  const prefix = `[Vision-Service] [${timestamp}] [${level.toUpperCase()}]`;

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
      throw new GatewayTimeoutError("视觉标签服务请求超时，请稍后再试");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapProviderError(statusCode: number, body: string) {
  if (statusCode === 401) {
    return new ServiceUnavailableError("视觉标签服务鉴权失败，请检查服务端配置", body);
  }
  if (statusCode === 429) {
    return new RateLimitError("视觉标签请求过于频繁，请稍后再试", body);
  }
  return new BadGatewayError(`视觉标签服务返回异常（${statusCode}）`, body);
}

function extractAssistantText(response: ArkResponse) {
  return (
    response.output
      ?.filter((item) => item.type === "message" && item.role === "assistant")
      .flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new BadGatewayError("视觉标签服务未返回可解析的 JSON");
  }

  return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
}

function normalizeVisualTags(value: Record<string, unknown>): VisualTags {
  const text = (key: string, fallback = "") =>
    typeof value[key] === "string" ? (value[key] as string).trim() : fallback;
  const unsafe = Array.isArray(value.unsafeOrSensitiveElements)
    ? value.unsafeOrSensitiveElements.filter((item): item is string => typeof item === "string")
    : [];

  return {
    hairStyle: text("hairStyle"),
    hairColor: text("hairColor"),
    outfitMood: text("outfitMood"),
    overallVibe: text("overallVibe"),
    expressionMood: text("expressionMood"),
    ageImpressionRange: text("ageImpressionRange"),
    unsafeOrSensitiveElements: unsafe,
    hasPerson: typeof value.hasPerson === "boolean" ? value.hasPerson : true,
    notes: text("notes") || undefined,
  };
}

function buildPrompt() {
  return [
    "请仔细观察这张参考图，并提取非身份化的人物视觉标签。",
    "请只返回严格 JSON，不要输出 Markdown，不要输出解释。",
    "JSON 字段必须完全使用以下键：",
    '{"hairStyle":"", "hairColor":"", "outfitMood":"", "overallVibe":"", "expressionMood":"", "ageImpressionRange":"", "unsafeOrSensitiveElements":[], "hasPerson":true, "notes":""}',
    "重点关注：1. 发型（长度、颜色、造型）；2. 气质；3. 穿搭（款式、材质、颜色、配饰）。",
    "如果图中没有人物，hasPerson 设为 false，其余人物字段留空，并在 notes 中说明原因。",
  ].join("\n");
}

export class VisualTagService {
  async extractFromTemporaryObject(temporaryObjectKey: string): Promise<{
    visualTags: VisualTags;
    provider: "ark-responses" | "mock-vision";
  }> {
    const env = getServerEnv();
    if (!env.ARK_API_KEY) {
      log("warn", "ARK_API_KEY missing; using mock visual tags");
      return { visualTags: MOCK_VISUAL_TAGS, provider: "mock-vision" };
    }

    const storage = getStorageService();
    const imageUrl = storage.getPublicObjectUrl(temporaryObjectKey);
    if (!imageUrl) {
      throw new ServiceUnavailableError(
        "视觉标签服务需要可公网访问的参考图，请先配置 R2 存储",
      );
    }

    log("info", "Requesting visual tags", {
      model: MODEL,
      temporaryObjectKey,
      imageUrl,
    });

    const response = await fetchWithTimeout(DEFAULT_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.ARK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_image",
                image_url: imageUrl,
              },
              {
                type: "input_text",
                text: buildPrompt(),
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw mapProviderError(response.status, body);
    }

    const body = (await response.json()) as ArkResponse;
    const assistantText = extractAssistantText(body);
    const visualTags = normalizeVisualTags(extractJsonObject(assistantText));

    log("info", "Visual tags extracted", { visualTags });
    return { visualTags, provider: "ark-responses" };
  }
}

let serviceInstance: VisualTagService | null = null;

export function getVisualTagService() {
  if (!serviceInstance) {
    serviceInstance = new VisualTagService();
  }

  return serviceInstance;
}
