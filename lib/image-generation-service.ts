import "server-only";

import { BadGatewayError, GatewayTimeoutError, RateLimitError, ServiceUnavailableError } from "@/lib/errors";
import { getServerEnv, isImageDebugEnabled } from "@/lib/env";
import { getStorageService } from "@/lib/storage-service";
import { buildCharacterPrompt, buildScenePrompt, type CharacterAssetKind, type VisualTheme } from "@/lib/visual-prompts";

const API_BASE_URL = "https://api.apimart.ai/v1";
const MODEL = "doubao-seedream-5-0-lite";
const REQUEST_TIMEOUT_MS = 30_000;
const TASK_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 2_000;
const MAX_RETRIES = 2;

type SubmitGenerationResponse = {
  code?: number;
  data?: Array<{
    status?: string;
    task_id?: string;
  }>;
};

type TaskStatusResponse = {
  code?: number;
  data?: {
    id?: string;
    status?: "pending" | "processing" | "completed" | "failed" | "cancelled";
    progress?: number;
    result?: {
      images?: Array<{
        url?: string[];
        expires_at?: number;
      }>;
    };
    error?: {
      code?: number;
      message?: string;
    };
  };
};

export type GeneratedVisualAssetInput = {
  assetType: "avatar" | "portrait" | "expression" | "scene";
  expression?: "neutral" | "happy" | "shy" | null;
  storageUrl: string;
  promptSnapshot: string;
};

class ImageProviderError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public retryable: boolean,
  ) {
    super(message);
    this.name = "ImageProviderError";
  }
}

function log(level: "info" | "warn" | "error", message: string, data?: unknown) {
  if (!isImageDebugEnabled()) return;

  const timestamp = new Date().toISOString();
  const prefix = `[Image-Service] [${timestamp}] [${level.toUpperCase()}]`;

  if (level === "error") {
    console.error(prefix, message, data);
  } else if (level === "warn") {
    console.warn(prefix, message, data);
  } else {
    console.log(prefix, message, data);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new GatewayTimeoutError("图像服务请求超时，请稍后再试");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapProviderError(statusCode: number, body: string) {
  if (statusCode === 401) {
    return new ServiceUnavailableError("图像生成服务鉴权失败，请检查服务端配置", body);
  }
  if (statusCode === 429) {
    return new RateLimitError("图像生成请求过于频繁，请稍后再试", body);
  }
  if (statusCode >= 500) {
    return new BadGatewayError("图像生成服务暂时不可用，请稍后再试", body);
  }
  return new BadGatewayError(`图像生成服务返回异常（${statusCode}）`, body);
}

async function retryWithBackoff<T>(fn: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof ImageProviderError
          ? error.retryable
          : error instanceof RateLimitError || error instanceof BadGatewayError;

      if (!retryable || attempt === MAX_RETRIES) {
        throw error;
      }

      const delay = 1_000 * 2 ** attempt;
      log("warn", "Retrying provider request", {
        attempt: attempt + 1,
        delay,
        error: error instanceof Error ? error.message : "unknown",
      });
      await sleep(delay);
    }
  }

  throw lastError;
}

export class ImageGenerationService {
  private apiKey: string;

  constructor() {
    const apiKey = getServerEnv().APIMART_API_KEY;
    if (!apiKey) {
      throw new Error("APIMART_API_KEY is not configured");
    }
    this.apiKey = apiKey;
  }

  private async uploadReferenceImage(key: string) {
    const storage = getStorageService();
    const object = await storage.readObject(key);
    const formData = new FormData();
    formData.append("file", new Blob([Uint8Array.from(object.bytes)], { type: object.contentType }), key.split("/").at(-1));

    log("info", "Uploading reference image to provider", {
      key,
      contentType: object.contentType,
      byteLength: object.bytes.byteLength,
    });

    const response = await retryWithBackoff(async () => {
      const res = await fetchWithTimeout(`${API_BASE_URL}/uploads/images`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw mapProviderError(res.status, body);
      }

      return res;
    });

    const body = (await response.json()) as { url?: string };
    if (!body.url) {
      throw new BadGatewayError("参考图上传成功，但未返回可用地址");
    }

    return body.url;
  }

  private async submitGeneration(input: {
    prompt: string;
    size: "1:1" | "3:4" | "16:9";
    imageUrls?: string[];
  }) {
    log("info", "Submitting image generation task", {
      model: MODEL,
      size: input.size,
      hasReferenceImage: Boolean(input.imageUrls?.length),
      promptLength: input.prompt.length,
    });

    const response = await retryWithBackoff(async () => {
      const res = await fetchWithTimeout(`${API_BASE_URL}/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          prompt: input.prompt,
          image_urls: input.imageUrls,
          size: input.size,
          resolution: "3K",
          output_format: "png",
          n: 1,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw mapProviderError(res.status, body);
      }

      return res;
    });

    const body = (await response.json()) as SubmitGenerationResponse;
    const taskId = body.data?.[0]?.task_id;
    if (!taskId) {
      throw new BadGatewayError("图像生成任务提交成功，但未返回 task_id");
    }

    log("info", "Image generation task submitted", { taskId });
    return taskId;
  }

  private async getTaskStatus(taskId: string) {
    const response = await retryWithBackoff(async () => {
      const res = await fetchWithTimeout(`${API_BASE_URL}/tasks/${taskId}?language=zh`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw mapProviderError(res.status, body);
      }

      return res;
    });

    return (await response.json()) as TaskStatusResponse;
  }

  private async waitForTask(taskId: string) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < TASK_TIMEOUT_MS) {
      const body = await this.getTaskStatus(taskId);
      const status = body.data?.status;

      log("info", "Polled image generation task", {
        taskId,
        status,
        progress: body.data?.progress,
      });

      if (status === "completed") {
        const imageUrl = body.data?.result?.images?.[0]?.url?.[0];
        if (!imageUrl) {
          throw new BadGatewayError("图像任务已完成，但没有返回图片地址");
        }
        return imageUrl;
      }

      if (status === "failed") {
        throw new BadGatewayError(
          "图像生成失败",
          body.data?.error?.message ?? `task_id=${taskId}`,
        );
      }

      if (status === "cancelled") {
        throw new BadGatewayError("图像生成任务已取消", `task_id=${taskId}`);
      }

      await sleep(POLL_INTERVAL_MS);
    }

    throw new GatewayTimeoutError("图像生成超时，请稍后再试", `task_id=${taskId}`);
  }

  private async generateSingleAsset(input: {
    assetType: GeneratedVisualAssetInput["assetType"];
    expression?: GeneratedVisualAssetInput["expression"];
    prompt: string;
    size: "1:1" | "3:4" | "16:9";
    referenceImageUrl?: string;
    category: string;
  }): Promise<GeneratedVisualAssetInput> {
    const taskId = await this.submitGeneration({
      prompt: input.prompt,
      size: input.size,
      imageUrls: input.referenceImageUrl ? [input.referenceImageUrl] : undefined,
    });
    const providerImageUrl = await this.waitForTask(taskId);
    const stored = await getStorageService().persistRemoteImage({
      sourceUrl: providerImageUrl,
      category: input.category,
    });

    return {
      assetType: input.assetType,
      expression: input.expression ?? null,
      storageUrl: stored.url,
      promptSnapshot: input.prompt,
    };
  }

  async generateCharacterAssets(input: {
    crushId: string;
    theme: VisualTheme;
    visualTags: Record<string, unknown>;
    personalitySummary?: string | null;
    referenceImageKey?: string;
  }) {
    const referenceImageUrl = input.referenceImageKey
      ? await this.uploadReferenceImage(input.referenceImageKey)
      : undefined;

    const assets: Array<{
      kind: CharacterAssetKind;
      assetType: GeneratedVisualAssetInput["assetType"];
      expression?: GeneratedVisualAssetInput["expression"];
      size: "1:1" | "3:4";
    }> = [
      { kind: "avatar", assetType: "avatar", size: "1:1" },
      { kind: "portrait", assetType: "portrait", size: "3:4" },
      { kind: "neutral", assetType: "expression", expression: "neutral", size: "3:4" },
      { kind: "happy", assetType: "expression", expression: "happy", size: "3:4" },
      { kind: "shy", assetType: "expression", expression: "shy", size: "3:4" },
    ];

    return Promise.all(
      assets.map((asset) =>
        this.generateSingleAsset({
          assetType: asset.assetType,
          expression: asset.expression,
          prompt: buildCharacterPrompt({
            assetKind: asset.kind,
            theme: input.theme,
            visualTags: input.visualTags,
            personalitySummary: input.personalitySummary,
          }),
          size: asset.size,
          referenceImageUrl,
          category: `crush-${input.crushId}`,
        }),
      ),
    );
  }

  async generateSceneAsset(input: {
    crushId: string;
    theme: VisualTheme;
    visualTags?: Record<string, unknown>;
    sceneDescription: string;
  }) {
    return this.generateSingleAsset({
      assetType: "scene",
      prompt: buildScenePrompt({
        theme: input.theme,
        visualTags: input.visualTags,
        sceneDescription: input.sceneDescription,
      }),
      size: "16:9",
      category: `crush-${input.crushId}`,
    });
  }
}

let serviceInstance: ImageGenerationService | null = null;

export function getImageGenerationService() {
  if (!serviceInstance) {
    serviceInstance = new ImageGenerationService();
  }

  return serviceInstance;
}
