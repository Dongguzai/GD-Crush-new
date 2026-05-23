import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, handleApiError } from "@/lib/errors";
import { startCurrentSimulation } from "@/lib/repositories";

const requestSchema = z.object({
  scenarioType: z.string().min(1),
  goal: z.string().min(1),
  background: z.string().min(1),
  triggerSource: z.enum(["user_click", "ta_invite"]).optional().default("user_click"),
  sourceMessageId: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse("模拟参数不正确。");
    }
    const session = await startCurrentSimulation({
      scenarioType: parsed.data.scenarioType,
      goal: parsed.data.goal,
      background: parsed.data.background,
      triggerSource: parsed.data.triggerSource,
      sourceMessageId: parsed.data.sourceMessageId,
    });
    return NextResponse.json({ sessionId: session.id, chapter: session.chapter ?? null });
  } catch (error) {
    return handleApiError(error);
  }
}
