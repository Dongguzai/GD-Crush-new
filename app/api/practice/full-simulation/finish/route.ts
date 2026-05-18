import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, handleApiError, notFoundResponse } from "@/lib/errors";
import { finishCurrentSimulation } from "@/lib/repositories";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse("模拟会话参数不正确。");
    }
    const run = await finishCurrentSimulation(parsed.data.sessionId);
    if (!run) {
      return notFoundResponse("模拟会话不存在。");
    }
    return NextResponse.json({ summary: run.coachAnalysisJson, suggestedAction: run });
  } catch (error) {
    return handleApiError(error);
  }
}
