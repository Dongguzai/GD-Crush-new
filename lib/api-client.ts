import type { ApiErrorResponse } from "@/lib/errors";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public payload?: Partial<ApiErrorResponse> | null,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type MaybeApiErrorResponse = Partial<ApiErrorResponse> & { error?: string };

async function readJsonBody<T>(response: Response) {
  return (await response.json().catch(() => null)) as T | MaybeApiErrorResponse | null;
}

export async function readApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await readJsonBody<T>(response);

  if (!response.ok) {
    const payload = body as MaybeApiErrorResponse | null;
    throw new ApiClientError(
      payload?.message ?? payload?.error ?? fallbackMessage,
      payload?.statusCode ?? response.status,
      payload,
    );
  }

  return body as T;
}

export function getClientErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error && error.message ? error.message : fallbackMessage;
}
