import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, handleApiError, notFoundResponse } from "@/lib/errors";
import { retryCurrentSimulationLastTurn } from "@/lib/repositories";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse("演练回退参数不正确。");
    }

    const result = await retryCurrentSimulationLastTurn(parsed.data.sessionId);
    if (!result) {
      return notFoundResponse("没有可重来的演练句子。");
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
