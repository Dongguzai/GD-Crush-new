import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, internalErrorResponse } from "@/lib/errors";
import { createCurrentUserCrush, getCurrentUserActiveCrush } from "@/lib/repositories";
import { RELATIONSHIP_STAGES } from "@/lib/constants";

const createCrushSchema = z.object({
  nickname: z.string().trim().min(1).max(40),
  relationshipOrigin: z.string().trim().max(500).optional().nullable(),
  currentStageGuess: z.enum(RELATIONSHIP_STAGES).optional().nullable(),
  lastInteraction: z.string().trim().max(1000).optional().nullable(),
  userGoal: z.string().trim().max(500).optional().nullable(),
  userAnxiety: z.string().trim().max(500).optional().nullable(),
});

export async function GET() {
  try {
    const crush = await getCurrentUserActiveCrush();
    return NextResponse.json(crush);
  } catch (error) {
    console.error("[crush] failed to load current crush", error);

    return internalErrorResponse(
      "读取 Crush 档案失败，请稍后重试。",
      error instanceof Error ? error.message : undefined,
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = createCrushSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse("Crush 信息不完整或格式不正确。", parsed.error.flatten());
    }

    const profile = await createCurrentUserCrush(parsed.data);

    return NextResponse.json({
      crushId: profile.id,
      profile,
    });
  } catch (error) {
    console.error("[crush] failed to create crush", error);

    return internalErrorResponse(
      "创建 Crush 草稿失败，请稍后重试。",
      error instanceof Error ? error.message : undefined,
    );
  }
}
