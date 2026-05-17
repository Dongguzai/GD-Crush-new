import "server-only";

import {
  BadGatewayError,
  BadRequestError,
  GatewayTimeoutError,
  RateLimitError,
  ServiceUnavailableError,
} from "@/lib/errors";
import { getServerEnv, isVoiceDebugEnabled } from "@/lib/env";
import { getStorageService } from "@/lib/storage-service";

const DEFAULT_STT_API_URL = "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash";
const DEFAULT_RESOURCE_ID = "volc.bigasr.auc_turbo";
const REQUEST_TIMEOUT_MS = 45_000;

type SttProviderResponse = {
  result?: {
    text?: string;
  };
};

function log(level: "info" | "warn" | "error", message: string, data?: unknown) {
  if (!isVoiceDebugEnabled()) return;

  const timestamp = new Date().toISOString();
  const prefix = `[STT-Service] [${timestamp}] [${level.toUpperCase()}]`;

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
      throw new GatewayTimeoutError("语音识别超时，请稍后再试");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapHttpError(statusCode: number, body: string) {
  if (statusCode === 401 || statusCode === 403) {
    return new ServiceUnavailableError("语音识别鉴权失败，请检查服务端配置", body);
  }
  if (statusCode === 429) {
    return new RateLimitError("语音识别请求过于频繁，请稍后再试", body);
  }
  return new BadGatewayError(`语音识别服务返回异常（${statusCode}）`, body);
}

function mapBusinessError(statusCode: string | null, message: string | null) {
  switch (statusCode) {
    case "20000003":
      return new BadRequestError("没有识别到有效语音，请重新录制。", message ?? undefined);
    case "45000001":
      return new BadRequestError("语音识别参数不正确。", message ?? undefined);
    case "45000002":
      return new BadRequestError("录音为空，请重新录制。", message ?? undefined);
    case "45000151":
      return new BadRequestError("录音格式不支持，请重新录制。", message ?? undefined);
    case "55000031":
      return new ServiceUnavailableError("语音识别服务繁忙，请稍后再试。", message ?? undefined);
    default:
      return new BadGatewayError(
        statusCode ? `语音识别服务返回失败（${statusCode}）` : "语音识别服务返回失败",
        message ?? undefined,
      );
  }
}

export class SttService {
  async transcribe(input: { audioObjectKey: string; userId: string }) {
    const env = getServerEnv();
    const apiKey = env.STT_API_KEY ?? env.TTS_API_KEY;

    if (!apiKey) {
      throw new Error("STT_API_KEY or TTS_API_KEY is not configured");
    }

    const audio = await getStorageService().readObject(input.audioObjectKey);
    const apiUrl = env.STT_API_URL ?? DEFAULT_STT_API_URL;
    const resourceId = env.STT_RESOURCE_ID ?? DEFAULT_RESOURCE_ID;
    const requestId = crypto.randomUUID();

    log("info", "Submitting STT request", {
      requestId,
      resourceId,
      audioObjectKey: input.audioObjectKey,
      contentType: audio.contentType,
      byteLength: audio.bytes.byteLength,
    });

    const response = await fetchWithTimeout(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Api-Resource-Id": resourceId,
        "X-Api-Request-Id": requestId,
        "X-Api-Sequence": "-1",
      },
      body: JSON.stringify({
        user: {
          uid: input.userId,
        },
        audio: {
          data: audio.bytes.toString("base64"),
        },
        request: {
          model_name: "bigmodel",
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw mapHttpError(response.status, body);
    }

    const providerStatus = response.headers.get("X-Api-Status-Code");
    const providerMessage = response.headers.get("X-Api-Message");

    if (providerStatus && providerStatus !== "20000000") {
      throw mapBusinessError(providerStatus, providerMessage);
    }

    const body = (await response.json().catch(() => null)) as SttProviderResponse | null;
    const text = body?.result?.text?.trim();

    if (!text) {
      throw new BadGatewayError("语音识别服务未返回可用文本");
    }

    log("info", "STT transcription completed", {
      requestId,
      providerStatus,
      textLength: text.length,
    });

    return {
      text,
      provider: "volc-bigasr-auc-turbo" as const,
    };
  }
}

let serviceInstance: SttService | null = null;

export function getSttService() {
  if (!serviceInstance) {
    serviceInstance = new SttService();
  }

  return serviceInstance;
}
