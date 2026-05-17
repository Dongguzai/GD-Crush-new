import { NextResponse } from "next/server";
import { z } from "zod";
import { runCurrentQuickPractice } from "@/lib/repositories";

const requestSchema = z.object({
  scenarioType: z.string().min(1),
  sendContext: z.string().min(1),
  userLine: z.string().trim().min(1).max(1000),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "演练参数不正确。", issues: parsed.error.flatten() }, { status: 400 });
  }
  const run = await runCurrentQuickPractice(parsed.data);
  return NextResponse.json({
    practiceRunId: run.id,
    riskLevel: run.riskLevel,
    simulatedReply: run.simulatedReply,
    coachAnalysis: run.coachAnalysisJson,
    suggestedLine: run.suggestedLine,
  });
}
