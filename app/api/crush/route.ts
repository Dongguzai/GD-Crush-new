import { NextResponse } from "next/server";
import { z } from "zod";
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
  const crush = await getCurrentUserActiveCrush();
  return NextResponse.json(crush);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createCrushSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Crush 信息不完整或格式不正确。", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const profile = await createCurrentUserCrush(parsed.data);

  return NextResponse.json({
    crushId: profile.id,
    profile,
  });
}
