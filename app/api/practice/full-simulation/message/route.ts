import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, handleApiError, notFoundResponse } from "@/lib/errors";
import { sendCurrentSimulationMessage } from "@/lib/repositories";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse("模拟消息不正确。");
    }
    const result = await sendCurrentSimulationMessage(parsed.data.sessionId, parsed.data.message);
    if (!result) {
      return notFoundResponse("模拟会话不存在。");
    }
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
