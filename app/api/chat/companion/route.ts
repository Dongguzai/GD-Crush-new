import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentCompanionChat, sendCurrentCompanionMessage, getCurrentUserActiveCrush } from "@/lib/repositories";
import { handleApiError } from "@/lib/errors";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  inputMode: z.enum(["text", "voice"]).default("text"),
});

export async function GET() {
  try {
    const chat = await getCurrentCompanionChat();
    return NextResponse.json(chat);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "消息不能为空。", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { profile: activeCrush } = await getCurrentUserActiveCrush();

    const result = await sendCurrentCompanionMessage(
      parsed.data.message,
      activeCrush ? {
        crushNickname: activeCrush.nickname,
        relationshipStage: activeCrush.realRelationshipStage,
        interactionTemperature: activeCrush.interactionTemperature,
      } : undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}