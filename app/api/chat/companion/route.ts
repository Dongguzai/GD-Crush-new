import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentCompanionChat, sendCurrentCompanionMessage, getCurrentUserActiveCrush, getCurrentPracticeChapters } from "@/lib/repositories";
import type { PersistedPracticeChapter } from "@/lib/repositories";
import { badRequestResponse, handleApiError } from "@/lib/errors";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  inputMode: z.enum(["text", "voice"]).default("text"),
  recentPracticeSummary: z.string().trim().max(1200).optional().nullable(),
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
      return badRequestResponse("消息不能为空。", parsed.error.flatten());
    }

    const { profile: activeCrush } = await getCurrentUserActiveCrush();

    // Fetch recent practice chapters for context
    let recentPracticeChapters: Array<{
      title: string;
      scenarioType: string;
      summary?: string;
      recommendedNextAction?: string;
    }> = [];
    if (activeCrush) {
      const chapters: PersistedPracticeChapter[] = await getCurrentPracticeChapters(activeCrush.id);
      // Get finished chapters with summaries, most recent first
      recentPracticeChapters = chapters
        .filter((chapter: PersistedPracticeChapter) => chapter.status === "finished" && chapter.summary?.summary)
        .slice(-3)
        .reverse()
        .map((chapter: PersistedPracticeChapter) => ({
          title: chapter.goal,
          scenarioType: chapter.scenarioType,
          summary: chapter.summary?.summary ?? undefined,
          recommendedNextAction: chapter.summary?.recommendedNextAction ?? undefined,
        }));
    }

    const result = await sendCurrentCompanionMessage(
      parsed.data.message,
      activeCrush ? {
        crushNickname: activeCrush.nickname,
        relationshipStage: activeCrush.realRelationshipStage,
        interactionTemperature: activeCrush.interactionTemperature,
        recentPracticeSummary: parsed.data.recentPracticeSummary ?? undefined,
        recentPracticeChapters,
      } : undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}