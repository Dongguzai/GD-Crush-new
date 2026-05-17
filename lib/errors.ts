import { NextResponse } from "next/server";

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  devMessage?: string;
  issues?: unknown;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public devMessage?: string
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON(): ApiErrorResponse {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      devMessage: this.devMessage,
    };
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string, devMessage?: string) {
    super(message, 400, devMessage);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = "未授权访问", devMessage?: string) {
    super(message, 401, devMessage);
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = "资源未找到", devMessage?: string) {
    super(message, 404, devMessage);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends ApiError {
  constructor(
    message: string,
    public issues?: Record<string, unknown>
  ) {
    super(message, 422);
    this.name = "ValidationError";
  }

  toJSON(): ApiErrorResponse {
    return {
      ...super.toJSON(),
      issues: this.issues,
    };
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message: string = "服务暂不可用", devMessage?: string) {
    super(message, 503, devMessage);
    this.name = "ServiceUnavailableError";
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = "请求过于频繁，请稍后再试", devMessage?: string) {
    super(message, 429, devMessage);
    this.name = "RateLimitError";
  }
}

export class GatewayTimeoutError extends ApiError {
  constructor(message: string = "请求超时，请稍后再试", devMessage?: string) {
    super(message, 504, devMessage);
    this.name = "GatewayTimeoutError";
  }
}

export class BadGatewayError extends ApiError {
  constructor(message: string = "上游服务返回异常", devMessage?: string) {
    super(message, 502, devMessage);
    this.name = "BadGatewayError";
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error("[API Error]", error);

  if (error instanceof ApiError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  if (error instanceof Error) {
    if (error.message.includes("API Key")) {
      return NextResponse.json(
        {
          error: "ConfigurationError",
          message: "AI 服务未正确配置",
          statusCode: 500,
          devMessage: error.message,
        },
        { status: 500 }
      );
    }

    if (error.name === "AbortError" || error.message.includes("timeout")) {
      return NextResponse.json(
        {
          error: "TimeoutError",
          message: "请求超时，请稍后再试",
          statusCode: 504,
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: "InternalError",
        message: "服务器内部错误",
        statusCode: 500,
        devMessage: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      error: "UnknownError",
      message: "发生未知错误",
      statusCode: 500,
    },
    { status: 500 }
  );
}

export function withErrorHandling<T extends (...args: Parameters<T>) => Promise<unknown>>(
  handler: T,
  options?: { logErrors?: boolean }
): T {
  return ((...args: Parameters<T>) => {
    try {
      return handler(...args);
    } catch (error) {
      if (options?.logErrors !== false) {
        console.error("[Handler Error]", error);
      }
      throw error;
    }
  }) as T;
}
