import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, handleApiError } from "@/lib/errors";
import { runCurrentQuickPractice } from "@/lib/repositories";

const requestSchema = z.object({
  scenarioType: z.string().min(1),
  sendContext: z.string().min(1),
  userLine: z.string().trim().min(1).max(1000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse("演练参数不正确。", parsed.error.flatten());
    }
    const run = await runCurrentQuickPractice(parsed.data);
    return NextResponse.json({
      practiceRunId: run.id,
      riskLevel: run.riskLevel,
      simulatedReply: run.simulatedReply,
      coachAnalysis: run.coachAnalysisJson,
      suggestedLine: run.suggestedLine,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
