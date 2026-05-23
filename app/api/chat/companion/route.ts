import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentCompanionChat, sendCurrentCompanionMessage, getCurrentUserActiveCrush, getCurrentPracticeChapters } from "@/lib/repositories";
import type { PersistedPracticeChapter } from "@/lib/repositories";
import { badRequestResponse, handleApiError } from "@/lib/errors";
import { trackChatMessage, trackAiMetrics } from "@/lib/analytics";

/**
 * Patterns that indicate user is discussing a real communication scenario
 * where practicing might be helpful.
 */
const PRACTICE_INVITE_PATTERNS = [
  // Invitation/intimate meeting scenarios
  /^(想|想请|想约|打算|准备)(约?|请|叫)/,
  /周末\s*约|约\s*周末|约TA|约\s*她|约\s*他|约\s*出来/,
  // Messaging concerns
  /怎么\s*(说|发|回|问|开口|跟TA|和她|和他)/,
  /不知道\s*(怎么|该不该|要不要|能不能)/,
  /怕\s*(说|发|问|说错|太突然|太直接|被拒绝)/,
  /担心\s*(自己|会|TA|她|他|结果)/,
  /这句话?\s*(能不能|要不要|该不该)/,
  // Text sending hesitation
  /发\s*(了\s*)?(消息|微信|短信|信息)/,
  /想\s*(给TA|给她|给他|跟他|跟她)/,
  // Apology/remedy
  /道歉?|补救?|挽回?|解释/,
  // Making a move
  /表白|告白|说\s*喜欢|表达|试探|推进/,
];

/**
 * Patterns that should NOT trigger practice invites (emotional processing,
 * pure feelings, speculation without real action intent).
 */
const EXCLUDE_PATTERNS = [
  /^(好累|好难过|好焦虑|好烦|好怕|想你|喜欢你|好开心|好开心)$/,
  /^(好累|好难过|好焦虑|好烦|好怕|想你|喜欢你|好开心|好开心)[。！？!?\s]*$/,
  /^(今天|刚才|最近)\s*(有点|很|好)?\s*(累|难过|焦虑|紧张|烦|开心|想你|喜欢你|害怕|不安)/,
  /^(如果|假如|要是|梦到|幻想|会不会|是不是|可能|也许|我猜)/,
  /^(感觉?|觉得?|觉得\s*TA)/,
];

function shouldOfferPracticeInvite(message: string, existingChapters: PersistedPracticeChapter[]): boolean {
  const trimmed = message.trim();

  // Don't invite if user already has an active practice session
  // (Persisted chapters can only be "active" or "finished", never "draft")
  const hasActivePractice = existingChapters.some((chapter) => chapter.status === "active");
  if (hasActivePractice) {
    return false;
  }

  // Exclude pure emotional/speculation messages
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }

  // Check for practice-worthy patterns
  for (const pattern of PRACTICE_INVITE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  return false;
}

function extractPracticeGoal(message: string): string {
  const trimmed = message.trim();

  // Extract invitation context
  if (/周末\s*约|约\s*周末/.test(trimmed)) {
    return "约 TA 周末见面";
  }
  if (/约TA|约\s*她|约\s*他|约\s*出来/.test(trimmed)) {
    return "约 TA 出来";
  }

  // Extract messaging context
  if (/怎么\s*(说|发|回|问|开口)/.test(trimmed)) {
    return "问清楚 TA 的意思";
  }
  if (/这句话?\s*(能不能|要不要|该不该)/.test(trimmed)) {
    return "决定要不要发这条消息";
  }

  // Extract apology context
  if (/道歉?|补救?|挽回?|解释/.test(trimmed)) {
    return "道歉或补救";
  }

  // Extract表白 context
  if (/表白|告白|说\s*喜欢/.test(trimmed)) {
    return "表达好感或表白";
  }

  // Generic
  return "把想说的话先演一遍";
}

function extractPracticeBackground(message: string): string {
  const trimmed = message.trim();
  const parts: string[] = [];

  // Extract specific concerns
  if (/怕\s*(说错|太突然|太直接|被拒绝)/.test(trimmed)) {
    const fearMatch = trimmed.match(/怕\s*(说错|太突然|太直接|被拒绝)/);
    if (fearMatch) {
      parts.push(`用户担心：${fearMatch[1]}`);
    }
  }

  if (/担心\s*(自己|会|结果)/.test(trimmed)) {
    parts.push("用户比较担心结果，有顾虑");
  }

  if (parts.length === 0) {
    parts.push("用户在考虑现实中的沟通策略");
  }

  return parts.join("；");
}

type PracticeInvite = {
  sourceMessageId: string;
  goal: string;
  background: string;
};

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
  const startTime = Date.now();

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

    // Track: user sent message
    trackChatMessage(true);

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

    // Track: AI response received (success)
    trackAiMetrics("companion_chat", {
      latencyMs: Date.now() - startTime,
      success: true,
    });

    // Generate practice invite if appropriate
    let practiceInvite: PracticeInvite | undefined;
    if (activeCrush) {
      // Get full practice chapters to check for active/draft status
      const allChapters: PersistedPracticeChapter[] = await getCurrentPracticeChapters(activeCrush.id);
      if (shouldOfferPracticeInvite(parsed.data.message, allChapters)) {
        practiceInvite = {
          sourceMessageId: result.userMessage.id,
          goal: extractPracticeGoal(parsed.data.message),
          background: extractPracticeBackground(parsed.data.message),
        };
      }
    }

    return NextResponse.json({ ...result, practiceInvite });
  } catch (error) {
    // Track: AI response failed
    trackAiMetrics("companion_chat", {
      latencyMs: Date.now() - startTime,
      success: false,
      errorType: error instanceof Error ? error.name : "unknown",
    });

    return handleApiError(error);
  }
}