import { NextResponse } from "next/server";
import { z } from "zod";
import { finishCurrentSimulation } from "@/lib/repositories";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "模拟会话参数不正确。" }, { status: 400 });
  }
  const run = await finishCurrentSimulation(parsed.data.sessionId);
  if (!run) {
    return NextResponse.json({ error: "模拟会话不存在。" }, { status: 404 });
  }
  return NextResponse.json({ summary: run.coachAnalysisJson, suggestedAction: run });
}
