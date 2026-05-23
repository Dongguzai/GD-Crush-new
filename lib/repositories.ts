import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { getCurrentUserId, getOrCreateUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  addDevMaterial,
  addDevMessage,
  addDevSimulationTurn,
  addDevVisualAssets,
  confirmDevProfileDraft,
  confirmDevUserAge,
  createDevAction,
  createDevCrush,
  createDevMemory,
  createDevProfileDraft,
  createDevQuickPractice,
  createDevRealityEvent,
  createDevRealityInferences,
  createDevRealitySignals,
  destroyDevCrush,
  finishDevSimulation,
  getActiveDevCrush,
  getDevActions,
  getDevActionById,
  getDevGrowthMetrics,
  getDevMaterials,
  getDevMaterialsForCrush,
  getDevMemories,
  getDevMessageById,
  getDevMessages,
  getDevMessagesForCrush,
  getDevPracticeRunById,
  getDevPracticeChaptersForCrush,
  getDevProfileDraft,
  getDevRealityEvents,
  getDevRealityInferences,
  getDevRealitySignals,
  getDevSessionById,
  getDevSuggestions,
  getDevSuggestionById,
  getDevTraits,
  getDevVisualAssets,
  getOrCreateDevSession,
  getOrCreateDevVoiceProfile,
  isDevCrushOwnedByUser,
  markDevReferenceImageDeleted,
  removeDevSimulationLastTurn,
  resolveDevSuggestion,
  startDevSimulation,
  updateDevAction,
  updateDevMessageAudio,
} from "@/lib/dev-store";
import { getServerEnv, hasDatabaseUrl } from "@/lib/env";
import {
  aiProfileDrafts,
  auditEvents,
  chatSessions,
  crushProfiles,
  crushTraits,
  growthMetrics,
  memories,
  messages,
  onboardingMaterials,
  practiceChapters,
  practiceRuns,
  profileUpdateSuggestions,
  realActions,
  realityEvents,
  realityInferences,
  realitySignals,
  users,
  userSettings,
  visualAssets,
  voiceProfiles,
} from "@/db/schema";
import {
  deletePublicAssetWithRetry,
  deleteStoredObjectWithRetry,
} from "@/lib/asset-lifecycle";
import {
  getImageGenerationService,
  type GeneratedVisualAssetInput,
} from "@/lib/image-generation-service";
import type {
  PracticeChapterRecapResult,
  PracticeSimulationTurnResult,
  QuickLineAnalysisResult,
} from "@/lib/ai-output-schemas";
import { getStorageService } from "@/lib/storage-service";
import { getTtsService } from "@/lib/tts-service";
import { BadRequestError, ServiceUnavailableError } from "@/lib/errors";
import type { VisualTheme } from "@/lib/visual-prompts";
import { trackPracticeChapter, trackAiMetrics } from "@/lib/analytics";

type ProfileFact = {
  label: string;
  value?: string;
};

type ProfileInference = {
  label: string;
  value?: string;
  confidence?: number;
};

type AiProfileAnalysis = {
  personalityTraits?: string[];
  communicationStyle?: string;
  likes?: string[];
  dislikes?: string[];
  emotionalTone?: string;
};

type QuickPracticeAnalysis = QuickLineAnalysisResult;

type PracticeChapterSummary = {
  summary?: string;
  mainRisk?: string;
  saferAlternative?: string;
  riskPoints?: string[];
  recommendedNextAction?: string;
  actionEligible?: boolean;
};

type PracticeChapterMessage = {
  id: string;
  role: "user" | "crush";
  content: string;
  coachTip?: Record<string, unknown> | null;
};

export type PersistedPracticeChapter = {
  id: string;
  status: "active" | "finished";
  scenarioType: string;
  goal: string;
  background: string;
  sessionId: string | null;
  messages: PracticeChapterMessage[];
  coachTips: Record<string, unknown>[];
  summary: PracticeChapterSummary | null;
  suggestedAction: {
    id: string;
    suggestedLine?: string | null;
    coachAnalysisJson?: PracticeChapterSummary | null;
  } | null;
  actionSaved: boolean;
  createdAt: string | Date;
};

type RealityEventOutput = {
  id: string;
  sourceType?: string | null;
  sourceMessageId?: string | null;
  eventText: string;
  eventType: string;
  occurredAtText?: string | null;
  extractionJson?: Record<string, unknown>;
  status: string;
  createdAt: string | Date;
};

type RealitySignalOutput = {
  id: string;
  eventId?: string | null;
  signalType: string;
  label: string;
  description?: string | null;
  polarity: string;
  confidence: number | null;
  evidenceJson?: Record<string, unknown>;
  status: string;
  createdAt: string | Date;
};

type RealityInferenceOutput = {
  id: string;
  eventId?: string | null;
  inferenceType: string;
  label: string;
  description?: string | null;
  confidence: number | null;
  evidenceJson?: Record<string, unknown>;
  status: string;
  createdAt: string | Date;
};

type RealityLayerOutput = {
  realityEvents: RealityEventOutput[];
  realitySignals: RealitySignalOutput[];
  realityInferences: RealityInferenceOutput[];
};

function asNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asSummary(value: unknown): PracticeChapterSummary | null {
  const record = asRecord(value);
  if (!Object.keys(record).length) {
    return null;
  }

  return {
    summary: typeof record.summary === "string" ? record.summary : undefined,
    mainRisk: typeof record.mainRisk === "string" ? record.mainRisk : undefined,
    saferAlternative: typeof record.saferAlternative === "string" ? record.saferAlternative : undefined,
    riskPoints: Array.isArray(record.riskPoints)
      ? record.riskPoints.filter((item): item is string => typeof item === "string")
      : undefined,
    recommendedNextAction:
      typeof record.recommendedNextAction === "string" ? record.recommendedNextAction : undefined,
    actionEligible: typeof record.actionEligible === "boolean" ? record.actionEligible : undefined,
  };
}

function getBackgroundFromContext(value: unknown) {
  const record = asRecord(value);
  return typeof record.background === "string" ? record.background : "";
}

function getCoachTipFromMessage(message: { metadataJson?: unknown }) {
  const metadata = asRecord(message.metadataJson);
  const coachTip = asRecord(metadata.coachTip);
  return Object.keys(coachTip).length ? coachTip : null;
}

function buildActionFeedbackEventText(input: {
  status: string;
  feedbackText?: string | null;
  actionTitle: string;
  suggestedMessage?: string | null;
  chapterTitle?: string | null;
  chapterBackground?: string | null;
  chapterSummary?: string | null;
}) {
  const feedbackText = input.feedbackText?.trim();
  const parts = [
    feedbackText || `用户更新行动结果为：${actionStatusLabel(input.status)}`,
    `行动：${input.actionTitle}`,
    input.suggestedMessage ? `原建议：${truncateForRealityContext(input.suggestedMessage)}` : null,
    input.chapterTitle ? `关联演练：${input.chapterTitle}` : null,
    input.chapterBackground ? `演练背景：${truncateForRealityContext(input.chapterBackground)}` : null,
    input.chapterSummary ? `演练复盘：${truncateForRealityContext(input.chapterSummary)}` : null,
  ].filter((part): part is string => Boolean(part));

  return parts.join("\n");
}

function buildActionFeedbackRealityRows(input: {
  crushId: string;
  eventId: string;
  actionId: string;
  status: string;
  feedbackText?: string | null;
  actionTitle: string;
  evidenceJson: Record<string, unknown>;
}) {
  const polarity = actionStatusPolarity(input.status);
  const confidence = actionStatusConfidence(input.status);
  const feedbackText = input.feedbackText?.trim();
  const signalDescription = feedbackText
    ? `用户反馈：${feedbackText}`
    : `用户把行动「${input.actionTitle}」标记为${actionStatusLabel(input.status)}`;
  const inferenceLabel =
    input.status === "positive_response"
      ? "互动温度可能升温"
      : input.status === "cold_response"
        ? "对方当前回应意愿可能偏低"
        : input.status === "neutral_response"
          ? "互动仍需继续观察"
          : "行动结果尚未形成明确关系判断";

  return {
    signals: [
      {
        crushId: input.crushId,
        eventId: input.eventId,
        signalType: "action_outcome",
        label: actionStatusLabel(input.status),
        description: signalDescription,
        polarity,
        confidence,
        evidenceJson: input.evidenceJson,
      },
    ],
    inferences: [
      {
        crushId: input.crushId,
        eventId: input.eventId,
        inferenceType: "relationship_temperature",
        label: inferenceLabel,
        description: `基于行动反馈「${actionStatusLabel(input.status)}」形成的保守推断，需要后续现实事件继续验证。`,
        confidence: Math.max(0.45, confidence - 0.08),
        evidenceJson: input.evidenceJson,
        status: "pending" as const,
      },
    ],
  };
}

function inferOccurredAtText(text: string) {
  const match = text.match(/(刚刚|刚才|今天|昨天|前天|上次|最近|这周|周末|今晚|早上|中午|下午|晚上|那天)/);
  return match?.[1] ?? null;
}

function actionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "尚未执行",
    sent: "已经行动",
    positive_response: "对方反馈偏积极",
    neutral_response: "对方反馈中性",
    cold_response: "对方反馈偏冷",
    skipped: "暂未行动",
  };
  return labels[status] ?? status;
}

function actionStatusPolarity(status: string) {
  if (status === "positive_response") return "positive";
  if (status === "cold_response") return "negative";
  return "neutral";
}

function actionStatusConfidence(status: string) {
  if (status === "positive_response") return 0.72;
  if (status === "cold_response") return 0.66;
  if (status === "neutral_response") return 0.6;
  return 0.55;
}

function truncateForRealityContext(text: string | null | undefined, limit = 160) {
  const trimmed = text?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 3)}...` : trimmed;
}

function mapDbDraft<T extends typeof aiProfileDrafts.$inferSelect>(draft: T) {
  return {
    ...draft,
    factsJson: Array.isArray(draft.factsJson) ? draft.factsJson : [],
    inferredTraitsJson: Array.isArray(draft.inferredTraitsJson) ? draft.inferredTraitsJson : [],
    boundariesJson: Array.isArray(draft.boundariesJson) ? draft.boundariesJson : [],
    confidence: asNumber(draft.confidence) ?? 0,
  };
}

function mapDbTrait<T extends typeof crushTraits.$inferSelect>(trait: T) {
  return {
    ...trait,
    confidence: asNumber(trait.confidence),
  };
}

function mapDbSuggestion<T extends typeof profileUpdateSuggestions.$inferSelect>(suggestion: T) {
  return {
    ...suggestion,
    confidence: asNumber(suggestion.confidence) ?? 0,
  };
}

function buildDraftPayload(
  profile: {
    relationshipOrigin?: string | null;
    personalitySummary?: string | null;
    realRelationshipStage?: string | null;
  },
  materials: Array<{ sanitizedText?: string | null }>,
  aiAnalysis?: AiProfileAnalysis | null,
) {
  const materialText = materials
    .map((item) => item.sanitizedText)
    .filter(Boolean)
    .join("\n");

  const facts = [
    profile.relationshipOrigin ? { label: "认识方式", value: profile.relationshipOrigin } : null,
    profile.personalitySummary ? { label: "最近互动", value: profile.personalitySummary } : null,
    materialText ? { label: "用户补充材料", value: materialText.slice(0, 120) } : null,
  ].filter(Boolean) as ProfileFact[];

  const inferred: Required<ProfileInference>[] = [];

  if (aiAnalysis?.personalityTraits?.length) {
    inferred.push({
      label: "性格特征",
      value: aiAnalysis.personalityTraits.join("；"),
      confidence: 0.75,
    });
  }
  if (aiAnalysis?.communicationStyle) {
    inferred.push({
      label: "沟通风格",
      value: aiAnalysis.communicationStyle,
      confidence: 0.72,
    });
  }
  if (aiAnalysis?.likes?.length) {
    inferred.push({
      label: "喜好",
      value: aiAnalysis.likes.join("；"),
      confidence: 0.68,
    });
  }
  if (aiAnalysis?.dislikes?.length) {
    inferred.push({
      label: "雷区",
      value: aiAnalysis.dislikes.join("；"),
      confidence: 0.7,
    });
  }
  if (!inferred.length) {
    inferred.push({
      label: "沟通节奏",
      value: materialText.includes("忙") ? "可能需要低频、轻量推进" : "适合先用轻松话题建立舒适度",
      confidence: 0.62,
    });
  }

  const boundaries: Required<ProfileInference>[] = [];
  if (aiAnalysis?.dislikes?.length) {
    for (const dislike of aiAnalysis.dislikes.slice(0, 2)) {
      boundaries.push({
        label: "避免",
        value: `不宜主动提 ${dislike}`,
        confidence: 0.65,
      });
    }
  }
  if (!boundaries.length) {
    boundaries.push({
      label: "避免连续追问",
      value: "在对方回复不明确时，先给空间，不追加压力。",
      confidence: 0.7,
    });
  }

  return {
    factsJson: facts,
    inferredTraitsJson: inferred,
    boundariesJson: boundaries,
    recommendedStage: profile.realRelationshipStage ?? "普通朋友",
    interactionTemperature: aiAnalysis?.emotionalTone?.includes("暖") ? "warm" : "neutral",
    confidence: aiAnalysis ? 0.78 : 0.66,
  };
}

function buildVisualAssetInputs(
  crushId: string,
  theme: string,
  generatedAssets?: GeneratedVisualAssetInput[],
): GeneratedVisualAssetInput[] {
  const base = `/api/mock-character?theme=${encodeURIComponent(theme)}&crush=${encodeURIComponent(crushId)}`;

  return (
    generatedAssets ?? [
      {
        assetType: "avatar",
        expression: null,
        storageUrl: `${base}&asset=avatar`,
        promptSnapshot: "MVP mock two-dimensional otome character asset",
      },
      {
        assetType: "portrait",
        expression: null,
        storageUrl: `${base}&asset=portrait`,
        promptSnapshot: "MVP mock two-dimensional otome character asset",
      },
      {
        assetType: "expression",
        expression: "neutral",
        storageUrl: `${base}&asset=neutral`,
        promptSnapshot: "MVP mock two-dimensional otome character asset",
      },
      {
        assetType: "expression",
        expression: "happy",
        storageUrl: `${base}&asset=happy`,
        promptSnapshot: "MVP mock two-dimensional otome character asset",
      },
      {
        assetType: "expression",
        expression: "shy",
        storageUrl: `${base}&asset=shy`,
        promptSnapshot: "MVP mock two-dimensional otome character asset",
      },
    ]
  );
}

function buildQuickPracticePayload(
  input: {
    scenarioType: string;
    sendContext: string;
    userLine: string;
  },
  aiAnalysis?: QuickPracticeAnalysis | null,
) {
  const riskLevel =
    aiAnalysis?.riskLevel ??
    (input.userLine.includes("必须") || input.userLine.includes("为什么不回")
      ? "high"
      : input.userLine.includes("单独") || input.userLine.includes("喜欢")
        ? "medium"
        : "low");

  const simulatedReply =
    riskLevel === "high"
      ? "我现在不太想聊这个，先这样吧。"
      : riskLevel === "medium"
        ? "啊这周可能有点忙，我看看吧。"
        : "听起来可以呀，到时候看看时间。";

  const suggestedLine =
    aiAnalysis?.suggestedLine ??
    (riskLevel === "high"
      ? "刚才我可能有点急了，你不用马上回复。等你方便的时候再说就好。"
      : "你之前提到的那件事我也挺感兴趣。要是哪天你也想去，我们可以一起。");

  return {
    riskLevel,
    simulatedReply,
    suggestedLine,
    coachAnalysisJson: {
      possibleFeeling:
        aiAnalysis?.possibleFeeling ??
        (riskLevel === "low" ? "压力较小，像自然延续话题。" : "对方可能感到推进略快或被施压。"),
      mainRisk: aiAnalysis?.mainRisk ?? (riskLevel === "low" ? "风险较低。" : "铺垫不足，表达压力偏高。"),
      advice: aiAnalysis?.recommendedTiming ?? (riskLevel === "high" ? "建议先降频，避免追问。" : "降低邀约压力，保留对方选择空间。"),
      shouldSend: aiAnalysis?.shouldSend ?? riskLevel !== "high",
    },
  };
}

function buildSimulationReply(message: string): PracticeSimulationTurnResult {
  const crushReply = message.includes("抱歉")
    ? "没事啦，只是当时有点突然。你这样说我会比较好理解。"
    : "我听到了，不过我可能需要一点时间想想。";
  const riskLevel: "high" | "low" = message.includes("必须") ? "high" : "low";
  const coachTip = {
    riskLevel,
    advice: message.includes("抱歉") ? "表达清楚且不过度解释，可以停在这里给对方空间。" : "继续保持轻量，不要急着要求对方表态。",
    nextMove: "观察对方是否主动延续话题。",
  };

  return { crushReply, coachTip };
}

function buildFinishedSimulationPayload(
  session: {
    crushId: string;
    id: string;
    scenarioType?: string | null;
  },
  recap?: PracticeChapterRecapResult | null,
) {
  if (recap) {
    return {
      crushId: session.crushId,
      sessionId: session.id,
      practiceType: "full_simulation",
      scenarioType: session.scenarioType ?? "conversation",
      riskLevel: recap.actionEligible ? "low" : "medium",
      simulatedReply: recap.summary,
      suggestedLine: recap.suggestedLine,
      coachAnalysisJson: {
        summary: recap.summary,
        mainRisk: recap.mainRisk,
        saferAlternative: recap.saferAlternative,
        riskPoints: recap.riskPoints,
        recommendedNextAction: recap.recommendedNextAction,
        actionEligible: recap.actionEligible,
      },
    };
  }

  return {
    crushId: session.crushId,
    sessionId: session.id,
    practiceType: "full_simulation",
    scenarioType: session.scenarioType ?? "conversation",
    riskLevel: "low",
    simulatedReply: "整体反馈较温和，但仍建议给对方空间。",
    suggestedLine: "刚刚那件事我想清楚了，不急着让你马上回应，只是想把我的意思说清楚。",
    coachAnalysisJson: {
      summary: "你完成了一轮克制表达，没有把压力推给对方。",
      riskPoints: ["后续不要连续追问结果。"],
      recommendedNextAction: "等待对方自然回应，至少间隔半天。",
    },
  };
}

type PracticeAiSession = {
  id: string;
  crushId: string;
  title?: string | null;
  scenarioType?: string | null;
};

async function getPracticeChapterForSession(session: PracticeAiSession) {
  if (!hasDatabaseUrl()) {
    const chapters = await getDevPracticeChaptersForCrush(session.crushId);
    return chapters.find((chapter) => chapter.practiceSessionId === session.id) ?? null;
  }

  const [chapter] = await getDb()
    .select()
    .from(practiceChapters)
    .where(eq(practiceChapters.practiceSessionId, session.id))
    .limit(1);
  return chapter ?? null;
}

async function getPracticeMessagesForSession(sessionId: string) {
  if (!hasDatabaseUrl()) {
    return getDevMessages(sessionId);
  }

  return getDb()
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));
}

async function buildPracticeAiContext(session: PracticeAiSession) {
  const [{ profile: active }, chapter, sessionMessages, realityLayer] = await Promise.all([
    getCurrentUserActiveCrush(),
    getPracticeChapterForSession(session),
    getPracticeMessagesForSession(session.id),
    getCurrentRealityLayer(session.crushId),
  ]);
  const realityContext = asRecord(chapter?.realityContextJson);
  const background = getBackgroundFromContext(realityContext) || session.title || "用户想先演一遍现实中的表达。";

  return {
    crushNickname: active?.nickname,
    relationshipStage: active?.realRelationshipStage,
    interactionTemperature: active?.interactionTemperature,
    scenarioType: chapter?.scenarioType ?? session.scenarioType ?? "conversation",
    goal: chapter?.title ?? session.title ?? "把想说的话先演一遍",
    background,
    recentRealityEvents: realityLayer.realityEvents.slice(-5),
    recentRealitySignals: realityLayer.realitySignals.slice(-5),
    recentRealityInferences: realityLayer.realityInferences.slice(-5),
    messages: sessionMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  };
}

async function generatePracticeTurn(session: PracticeAiSession, message: string): Promise<PracticeSimulationTurnResult> {
  const startedAt = Date.now();

  try {
    const { getDeepSeekService } = await import("@/lib/ai-service");
    const result = await getDeepSeekService().simulatePracticeTurn(await buildPracticeAiContext(session), message);
    trackAiMetrics("practice_simulation_turn", {
      latencyMs: Date.now() - startedAt,
      success: true,
    });
    return result;
  } catch (error) {
    trackAiMetrics("practice_simulation_turn", {
      latencyMs: Date.now() - startedAt,
      success: false,
      errorType: error instanceof Error ? error.name : "unknown",
    });
    console.warn("[AI] Practice simulation turn failed, falling back to local reply", error);
    return buildSimulationReply(message);
  }
}

async function generatePracticeRecap(session: PracticeAiSession): Promise<PracticeChapterRecapResult | null> {
  const startedAt = Date.now();

  try {
    const { getDeepSeekService } = await import("@/lib/ai-service");
    const result = await getDeepSeekService().recapPracticeChapter(await buildPracticeAiContext(session));
    trackAiMetrics("practice_chapter_recap", {
      latencyMs: Date.now() - startedAt,
      success: true,
    });
    return result;
  } catch (error) {
    trackAiMetrics("practice_chapter_recap", {
      latencyMs: Date.now() - startedAt,
      success: false,
      errorType: error instanceof Error ? error.name : "unknown",
    });
    console.warn("[AI] Practice recap failed, falling back to local recap", error);
    return null;
  }
}

function buildVoiceDefaults(theme: string) {
  return {
    voiceStyle: theme === "dream_otome" ? "romantic" : theme === "city_healing" ? "gentle" : "clear",
    speed: theme === "city_healing" ? "slow" : "normal",
    emotionLevel: theme === "dream_otome" ? "sweet" : "natural",
    ageStyle: "young",
  };
}

async function getDbActiveCrush(userId: string) {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(crushProfiles)
    .where(and(eq(crushProfiles.userId, userId), eq(crushProfiles.status, "active")))
    .limit(1);

  return profile ?? null;
}

async function getOrCreateDbSession(crushId: string, sessionType: string, title?: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.crushId, crushId),
        eq(chatSessions.sessionType, sessionType),
        eq(chatSessions.status, "active"),
      ),
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  const [session] = await db
    .insert(chatSessions)
    .values({
      crushId,
      sessionType,
      title: title ?? null,
    })
    .returning();

  return session;
}

async function updateDbMetrics(
  crushId: string,
  update: (current: typeof growthMetrics.$inferSelect) => Partial<typeof growthMetrics.$inferInsert>,
) {
  const db = getDb();
  const [current] = await db.select().from(growthMetrics).where(eq(growthMetrics.crushId, crushId)).limit(1);

  if (!current) {
    return null;
  }

  const [updated] = await db
    .update(growthMetrics)
    .set({
      ...update(current),
      updatedAt: new Date(),
    })
    .where(eq(growthMetrics.crushId, crushId))
    .returning();

  return updated ?? null;
}

async function addDbMessage(input: {
  sessionId: string;
  role: "user" | "crush" | "coach" | "system";
  content: string;
  audioUrl?: string | null;
  metadataJson?: unknown;
}) {
  const db = getDb();
  const [message] = await db
    .insert(messages)
    .values({
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      audioUrl: input.audioUrl ?? null,
      metadataJson: input.metadataJson,
    })
    .returning();

  const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, input.sessionId)).limit(1);

  if (session) {
    await db.update(chatSessions).set({ updatedAt: message.createdAt }).where(eq(chatSessions.id, session.id));

    if (input.role === "crush") {
      await updateDbMetrics(session.crushId, (current) => ({
        virtualIntimacy: Math.min(999, current.virtualIntimacy + 2),
        emotionalStability: Math.min(100, current.emotionalStability + 1),
      }));
    }
  }

  return message;
}

async function addDbVisualAssets(
  crushId: string,
  input: {
    theme: string;
    visualTags: Record<string, unknown>;
    referenceImageKey?: string;
  },
  generatedAssets?: GeneratedVisualAssetInput[],
) {
  const db = getDb();
  const assetInputs = buildVisualAssetInputs(crushId, input.theme, generatedAssets);
  const inserted = await db
    .insert(visualAssets)
    .values(
      assetInputs.map((asset) => ({
        crushId,
        assetType: asset.assetType,
        expression: asset.expression ?? null,
        theme: input.theme,
        visualTagsJson: input.visualTags,
        storageUrl: asset.storageUrl,
        promptSnapshot: asset.promptSnapshot ?? "MVP mock two-dimensional otome character asset",
      })),
    )
    .returning();

  return inserted;
}

async function markDbReferenceImageDeleted(crushId: string, referenceImageKey: string) {
  const db = getDb();
  const deletedAt = new Date();
  const updated = await db
    .update(onboardingMaterials)
    .set({
      retentionStatus: "deleted",
      deletedAt,
    })
    .where(
      and(
        eq(onboardingMaterials.crushId, crushId),
        eq(onboardingMaterials.materialType, "reference_image"),
        eq(onboardingMaterials.retentionStatus, "temporary"),
        eq(onboardingMaterials.storageUrl, referenceImageKey),
      ),
    )
    .returning();

  if (updated.length > 0) {
    const [profile] = await db
      .select({ userId: crushProfiles.userId })
      .from(crushProfiles)
      .where(eq(crushProfiles.id, crushId))
      .limit(1);

    if (profile) {
      await db.insert(auditEvents).values({
        userId: profile.userId,
        eventType: "image_deleted",
        createdAt: deletedAt,
      });
    }
  }

  return updated[0] ?? null;
}

async function getDbMessagesForCrush(crushId: string) {
  const db = getDb();
  const sessions = await db.select({ id: chatSessions.id }).from(chatSessions).where(eq(chatSessions.crushId, crushId));
  const sessionIds = sessions.map((session) => session.id);

  if (!sessionIds.length) {
    return [];
  }

  return db.select().from(messages).where(inArray(messages.sessionId, sessionIds));
}

async function isCurrentUserOwnedCrush(crushId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return false;
  }

  if (!hasDatabaseUrl()) {
    return isDevCrushOwnedByUser(userId, crushId);
  }

  const [profile] = await getDb()
    .select({ id: crushProfiles.id })
    .from(crushProfiles)
    .where(and(eq(crushProfiles.id, crushId), eq(crushProfiles.userId, userId)))
    .limit(1);

  return Boolean(profile);
}

async function getCurrentOwnedDraftById(draftId: string) {
  if (!hasDatabaseUrl()) {
    const draft = await getDevProfileDraft(draftId);
    return draft && (await isCurrentUserOwnedCrush(draft.crushId)) ? draft : null;
  }

  const [draft] = await getDb().select().from(aiProfileDrafts).where(eq(aiProfileDrafts.id, draftId)).limit(1);
  return draft && (await isCurrentUserOwnedCrush(draft.crushId)) ? mapDbDraft(draft) : null;
}

async function getCurrentOwnedSessionById(sessionId: string) {
  const session = !hasDatabaseUrl()
    ? await getDevSessionById(sessionId)
    : (
        await getDb()
          .select()
          .from(chatSessions)
          .where(eq(chatSessions.id, sessionId))
          .limit(1)
      )[0] ?? null;

  if (!session || !(await isCurrentUserOwnedCrush(session.crushId))) {
    return null;
  }

  return session;
}

async function getCurrentOwnedActionById(actionId: string) {
  const action = !hasDatabaseUrl()
    ? await getDevActionById(actionId)
    : (
        await getDb()
          .select()
          .from(realActions)
          .where(eq(realActions.id, actionId))
          .limit(1)
      )[0] ?? null;

  if (!action || !(await isCurrentUserOwnedCrush(action.crushId))) {
    return null;
  }

  return action;
}

async function getCurrentOwnedSuggestionById(suggestionId: string) {
  if (!hasDatabaseUrl()) {
    const suggestion = await getDevSuggestionById(suggestionId);
    return suggestion && (await isCurrentUserOwnedCrush(suggestion.crushId)) ? suggestion : null;
  }

  const [suggestion] = await getDb()
    .select()
    .from(profileUpdateSuggestions)
    .where(eq(profileUpdateSuggestions.id, suggestionId))
    .limit(1);
  return suggestion && (await isCurrentUserOwnedCrush(suggestion.crushId)) ? mapDbSuggestion(suggestion) : null;
}

async function getCurrentOwnedPracticeRunById(practiceRunId: string) {
  const run = !hasDatabaseUrl()
    ? await getDevPracticeRunById(practiceRunId)
    : (
        await getDb()
          .select()
          .from(practiceRuns)
          .where(eq(practiceRuns.id, practiceRunId))
          .limit(1)
      )[0] ?? null;

  if (!run || !(await isCurrentUserOwnedCrush(run.crushId))) {
    return null;
  }

  return run;
}

async function getCurrentOwnedMessageById(messageId: string) {
  const message = !hasDatabaseUrl()
    ? await getDevMessageById(messageId)
    : (
        await getDb()
          .select()
          .from(messages)
          .where(eq(messages.id, messageId))
          .limit(1)
      )[0] ?? null;

  if (!message) {
    return null;
  }

  const session = await getCurrentOwnedSessionById(message.sessionId);
  return session ? message : null;
}

async function isCurrentOwnedMemorySource(sourceId: string) {
  const [message, action, run, session] = await Promise.all([
    getCurrentOwnedMessageById(sourceId),
    getCurrentOwnedActionById(sourceId),
    getCurrentOwnedPracticeRunById(sourceId),
    getCurrentOwnedSessionById(sourceId),
  ]);

  return Boolean(message || action || run || session);
}

export async function confirmCurrentUserAge() {
  const userId = await getOrCreateUserId();

  if (!hasDatabaseUrl()) {
    return confirmDevUserAge(userId);
  }

  const db = getDb();
  const now = new Date();
  await db
    .insert(users)
    .values({ id: userId, ageConfirmedAt: now })
    .onConflictDoUpdate({
      target: users.id,
      set: { ageConfirmedAt: now, updatedAt: now },
    });
  await db.insert(userSettings).values({ userId }).onConflictDoNothing();
  await db.insert(auditEvents).values({ userId, eventType: "age_confirmed" });
  return { id: userId, ageConfirmedAt: now.toISOString() };
}

export async function createCurrentUserCrush(input: {
  nickname: string;
  relationshipOrigin?: string | null;
  currentStageGuess?: string | null;
  lastInteraction?: string | null;
  userGoal?: string | null;
  userAnxiety?: string | null;
}) {
  const userId = await getOrCreateUserId();

  if (!hasDatabaseUrl()) {
    return createDevCrush(userId, input);
  }

  const db = getDb();
  await db.insert(users).values({ id: userId }).onConflictDoNothing();
  await db.insert(userSettings).values({ userId }).onConflictDoNothing();

  const existing = await getDbActiveCrush(userId);
  if (existing) {
    return existing;
  }

  const [profile] = await db
    .insert(crushProfiles)
    .values({
      userId,
      nickname: input.nickname,
      relationshipOrigin: input.relationshipOrigin,
      realRelationshipStage: input.currentStageGuess ?? "普通朋友",
      userGoal: input.userGoal,
      userAnxiety: input.userAnxiety,
      personalitySummary: input.lastInteraction ? `最近互动：${input.lastInteraction}` : null,
    })
    .returning();

  await db.insert(growthMetrics).values({ crushId: profile.id }).onConflictDoNothing();
  return profile;
}

export async function getCurrentUserActiveCrush() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { profile: null, metrics: null };
  }

  if (!hasDatabaseUrl()) {
    const profile = await getActiveDevCrush(userId);
    const metrics = profile ? await getDevGrowthMetrics(profile.id) : null;
    return { profile, metrics };
  }

  const db = getDb();
  const profile = await getDbActiveCrush(userId);

  if (!profile) {
    return { profile: null, metrics: null };
  }

  const [metrics] = await db
    .select()
    .from(growthMetrics)
    .where(eq(growthMetrics.crushId, profile.id))
    .limit(1);

  return { profile, metrics: metrics ?? null };
}

export async function addCurrentCrushMaterial(input: {
  materialType: string;
  sanitizedText?: string | null;
  storageUrl?: string | null;
}) {
  const { profile: active } = await getCurrentUserActiveCrush();

  if (!active) {
    throw new Error("No active Crush profile.");
  }

  if (!hasDatabaseUrl()) {
    return addDevMaterial(active.id, input);
  }

  const db = getDb();
  const [material] = await db
    .insert(onboardingMaterials)
    .values({
      crushId: active.id,
      materialType: input.materialType,
      sanitizedText: input.sanitizedText ?? null,
      storageUrl: input.storageUrl ?? null,
      retentionStatus: input.materialType === "reference_image" ? "temporary" : "retained_summary",
    })
    .returning();

  return material;
}

export async function analyzeCurrentCrushProfile() {
  const { profile: active } = await getCurrentUserActiveCrush();

  if (!active) {
    throw new Error("No active Crush profile.");
  }

  const materials = hasDatabaseUrl()
    ? await getDb().select().from(onboardingMaterials).where(eq(onboardingMaterials.crushId, active.id))
    : await getDevMaterials(active.id);
  const materialList = materials
    .map((material) => material.sanitizedText)
    .filter(Boolean) as string[];

  let analysisResult: {
    profile: {
      personalityTraits: string[];
      likes: string[];
      dislikes: string[];
      communicationStyle: string;
    };
    textAnalysis: {
      emotionalTone: string;
      underlyingIntent: string;
    };
  } | null = null;

  try {
    const { getDeepSeekService } = await import("@/lib/ai-service");
    const aiService = getDeepSeekService();

    const inputMaterials = [
      { relationshipOrigin: active.relationshipOrigin },
      { personalitySummary: active.personalitySummary },
      { userGoal: active.userGoal },
      { userAnxiety: active.userAnxiety },
    ];
    for (const text of materialList) {
      inputMaterials.push({ personalitySummary: text });
    }

    analysisResult = await aiService.analyzeProfile(inputMaterials, active.nickname);
  } catch (error) {
    console.warn("[AI] Profile analysis failed, falling back to mock", error);
  }

  const aiAnalysis: AiProfileAnalysis = {
    personalityTraits: analysisResult?.profile?.personalityTraits ?? [],
    communicationStyle: analysisResult?.profile?.communicationStyle ?? "",
    likes: analysisResult?.profile?.likes ?? [],
    dislikes: analysisResult?.profile?.dislikes ?? [],
    emotionalTone: analysisResult?.textAnalysis?.emotionalTone ?? "",
  };

  if (!hasDatabaseUrl()) {
    return createDevProfileDraft(active.id, aiAnalysis);
  }

  const payload = buildDraftPayload(active, materials, aiAnalysis);
  const [draft] = await getDb()
    .insert(aiProfileDrafts)
    .values({
      crushId: active.id,
      ...payload,
      confidence: String(payload.confidence),
    })
    .returning();

  return mapDbDraft(draft);
}

export async function confirmCurrentDraft(
  draftId: string,
  input: {
    acceptedFacts?: ProfileFact[];
    acceptedTraits?: ProfileInference[];
    realRelationshipStage?: string;
    interactionTemperature?: string;
  },
) {
  const ownedDraft = await getCurrentOwnedDraftById(draftId);
  if (!ownedDraft) {
    return null;
  }

  if (!hasDatabaseUrl()) {
    return confirmDevProfileDraft(draftId, input);
  }

  const db = getDb();
  const draft = ownedDraft;
  const now = new Date();
  const [profile] = await db
    .update(crushProfiles)
    .set({
      realRelationshipStage: input.realRelationshipStage ?? draft.recommendedStage,
      interactionTemperature: input.interactionTemperature ?? draft.interactionTemperature,
      aiConfidence: String(draft.confidence),
      updatedAt: now,
    })
    .where(eq(crushProfiles.id, draft.crushId))
    .returning();

  await db
    .update(aiProfileDrafts)
    .set({
      status: "confirmed",
      confirmedAt: now,
    })
    .where(eq(aiProfileDrafts.id, draft.id));

  const facts = input.acceptedFacts ?? (draft.factsJson as ProfileFact[]);
  const traits = input.acceptedTraits ?? (draft.inferredTraitsJson as ProfileInference[]);
  const boundaries = draft.boundariesJson as ProfileInference[];
  const traitRows = [
    ...facts.map((fact) => ({
      crushId: draft.crushId,
      traitType: "fact",
      label: fact.label,
      description: fact.value ?? null,
      source: "ai",
      confidence: "1",
      confirmed: true,
    })),
    ...traits.map((trait) => ({
      crushId: draft.crushId,
      traitType: "style",
      label: trait.label,
      description: trait.value ?? null,
      source: "ai",
      confidence: String(trait.confidence ?? draft.confidence),
      confirmed: true,
    })),
    ...boundaries.map((boundary) => ({
      crushId: draft.crushId,
      traitType: "boundary",
      label: boundary.label,
      description: boundary.value ?? null,
      source: "ai",
      confidence: String(boundary.confidence ?? draft.confidence),
      confirmed: true,
    })),
  ];

  if (traitRows.length) {
    await db.insert(crushTraits).values(traitRows);
  }

  await updateDbMetrics(draft.crushId, (current) => ({
    relationshipUnderstanding: Math.min(100, current.relationshipUnderstanding + 12),
  }));

  return { draft, profile };
}

export async function getCurrentCrushProfileDetail() {
  const { profile, metrics } = await getCurrentUserActiveCrush();

  if (!profile) {
    return {
      profile,
      metrics,
      traits: [],
      materials: [],
      visualAssets: [],
      realityEvents: [],
      realitySignals: [],
      realityInferences: [],
    };
  }

  if (!hasDatabaseUrl()) {
    const realityLayer = await getCurrentRealityLayer(profile.id);
    return {
      profile,
      metrics,
      traits: await getDevTraits(profile.id),
      materials: await getDevMaterials(profile.id),
      visualAssets: await getDevVisualAssets(profile.id),
      ...realityLayer,
    };
  }

  const db = getDb();
  const [traits, materials, assets, realityLayer] = await Promise.all([
    db.select().from(crushTraits).where(eq(crushTraits.crushId, profile.id)).orderBy(asc(crushTraits.createdAt)),
    db
      .select()
      .from(onboardingMaterials)
      .where(eq(onboardingMaterials.crushId, profile.id))
      .orderBy(asc(onboardingMaterials.createdAt)),
    db.select().from(visualAssets).where(eq(visualAssets.crushId, profile.id)).orderBy(asc(visualAssets.createdAt)),
    getCurrentRealityLayer(profile.id),
  ]);

  return {
    profile,
    metrics,
    traits: traits.map(mapDbTrait),
    materials,
    visualAssets: assets,
    ...realityLayer,
  };
}

export async function getProfileDraftById(draftId: string) {
  return getCurrentOwnedDraftById(draftId);
}

export async function generateCurrentCrushVisualAssets(input: {
  theme: VisualTheme;
  visualTags: Record<string, unknown>;
  referenceImageKey?: string;
}) {
  const { profile: active } = await getCurrentUserActiveCrush();

  if (!active) {
    throw new Error("No active Crush profile.");
  }

  let generatedAssets: GeneratedVisualAssetInput[] | undefined;

  if (getServerEnv().APIMART_API_KEY) {
    generatedAssets = await getImageGenerationService().generateCharacterAssets({
      crushId: active.id,
      theme: input.theme,
      visualTags: input.visualTags,
      personalitySummary: active.personalitySummary,
      referenceImageKey: input.referenceImageKey,
    });
  }

  const assets = hasDatabaseUrl()
    ? await addDbVisualAssets(active.id, input, generatedAssets)
    : await addDevVisualAssets(active.id, input, generatedAssets);

  let referenceImageDeleted = false;
  if (input.referenceImageKey) {
    const storage = getStorageService();
    try {
      await deleteStoredObjectWithRetry(storage, input.referenceImageKey);
      await (hasDatabaseUrl()
        ? markDbReferenceImageDeleted(active.id, input.referenceImageKey)
        : markDevReferenceImageDeleted(active.id, input.referenceImageKey));
      referenceImageDeleted = true;
    } catch (error) {
      console.warn("[Storage] Failed to delete temporary reference image", error);
      throw new ServiceUnavailableError(
        "参考图清理未完成，请稍后重试。",
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  return { assets, referenceImageDeleted };
}

export async function generateCurrentCrushSceneAsset(input: {
  theme: VisualTheme;
  visualTags?: Record<string, unknown>;
  sceneDescription: string;
}) {
  const { profile: active } = await getCurrentUserActiveCrush();

  if (!active) {
    throw new Error("No active Crush profile.");
  }

  const generatedAsset = getServerEnv().APIMART_API_KEY
    ? await getImageGenerationService().generateSceneAsset({
        crushId: active.id,
        theme: input.theme,
        visualTags: input.visualTags,
        sceneDescription: input.sceneDescription,
      })
    : {
        assetType: "scene" as const,
        expression: null,
        storageUrl: `/api/mock-character?theme=${encodeURIComponent(input.theme)}&crush=${encodeURIComponent(active.id)}&asset=scene`,
        promptSnapshot: "MVP mock two-dimensional otome scene asset",
      };

  const [asset] = hasDatabaseUrl()
    ? await addDbVisualAssets(
        active.id,
        {
          theme: input.theme,
          visualTags: input.visualTags ?? {},
        },
        [generatedAsset],
      )
    : await addDevVisualAssets(
        active.id,
        {
          theme: input.theme,
          visualTags: input.visualTags ?? {},
        },
        [generatedAsset],
      );

  return asset;
}

export async function getCurrentCompanionChat() {
  const { profile: active } = await getCurrentUserActiveCrush();
  const userId = await getCurrentUserId();

  // Get user settings
  let userSettings: UserSettings | null = null;
  if (userId) {
    try {
      userSettings = await getOrCreateUserSettings(userId);
    } catch {
      // Settings are optional, continue without them
    }
  }

  if (!active) {
    return {
      profile: null,
      session: null,
      messages: [],
      practiceChapters: [],
      realityEvents: [],
      realitySignals: [],
      realityInferences: [],
      userSettings,
    };
  }

  if (!hasDatabaseUrl()) {
    const session = await getOrCreateDevSession(active.id, "companion", "甜蜜陪伴");
    const sessionMessages = await getDevMessages(session.id);
    const [chapters, realityLayer] = await Promise.all([
      getCurrentPracticeChapters(active.id),
      getCurrentRealityLayer(active.id),
    ]);
    return { profile: active, session, messages: sessionMessages, practiceChapters: chapters, ...realityLayer, userSettings };
  }

  const db = getDb();
  const session = await getOrCreateDbSession(active.id, "companion", "甜蜜陪伴");
  const sessionMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, session.id))
    .orderBy(asc(messages.createdAt));

  const [chapters, realityLayer] = await Promise.all([
    getCurrentPracticeChapters(active.id),
    getCurrentRealityLayer(active.id),
  ]);
  return { profile: active, session, messages: sessionMessages, practiceChapters: chapters, ...realityLayer, userSettings };
}

async function getCurrentPracticeChapters(crushId: string): Promise<PersistedPracticeChapter[]> {
  if (!hasDatabaseUrl()) {
    const [chapters, actions] = await Promise.all([
      getDevPracticeChaptersForCrush(crushId),
      getDevActions(crushId),
    ]);

    const hydrated = await Promise.all(
      chapters.map(async (chapter) => {
        const [sessionMessages, run] = await Promise.all([
          chapter.practiceSessionId ? getDevMessages(chapter.practiceSessionId) : Promise.resolve([]),
          chapter.practiceRunId ? getDevPracticeRunById(chapter.practiceRunId) : Promise.resolve(null),
        ]);
        const chapterMessages = sessionMessages
          .filter((message) => message.role === "user" || message.role === "crush")
          .map((message) => ({
            id: message.id,
            role: message.role as "user" | "crush",
            content: message.content,
            coachTip: message.role === "crush" ? getCoachTipFromMessage(message) : null,
          }));
        const coachTips = chapterMessages
          .map((message) => message.coachTip)
          .filter((tip): tip is Record<string, unknown> => Boolean(tip));
        const summary = asSummary(chapter.recapJson) ?? asSummary(run?.coachAnalysisJson);

        return {
          id: chapter.id,
          status: chapter.status === "completed" ? "finished" : "active",
          scenarioType: chapter.scenarioType,
          goal: chapter.title,
          background: getBackgroundFromContext(chapter.realityContextJson),
          sessionId: chapter.practiceSessionId ?? null,
          messages: chapterMessages,
          coachTips,
          summary,
          suggestedAction: run
            ? {
                id: run.id,
                suggestedLine: run.suggestedLine ?? null,
                coachAnalysisJson: asSummary(run.coachAnalysisJson),
              }
            : null,
          actionSaved: run ? actions.some((action) => action.practiceRunId === run.id) : false,
          createdAt: chapter.createdAt,
        } satisfies PersistedPracticeChapter;
      }),
    );

    return hydrated.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }

  const db = getDb();
  const chapters = await db
    .select()
    .from(practiceChapters)
    .where(eq(practiceChapters.crushId, crushId))
    .orderBy(asc(practiceChapters.createdAt));

  if (!chapters.length) {
    return [];
  }

  const sessionIds = chapters
    .map((chapter) => chapter.practiceSessionId)
    .filter((sessionId): sessionId is string => Boolean(sessionId));
  const runIds = chapters
    .map((chapter) => chapter.practiceRunId)
    .filter((runId): runId is string => Boolean(runId));

  const [chapterMessages, runs, actions] = await Promise.all([
    sessionIds.length
      ? db.select().from(messages).where(inArray(messages.sessionId, sessionIds)).orderBy(asc(messages.createdAt))
      : Promise.resolve([]),
    runIds.length
      ? db.select().from(practiceRuns).where(inArray(practiceRuns.id, runIds))
      : Promise.resolve([]),
    runIds.length
      ? db.select().from(realActions).where(inArray(realActions.practiceRunId, runIds))
      : Promise.resolve([]),
  ]);

  return chapters.map((chapter) => {
    const sessionMessages = chapterMessages
      .filter((message) => message.sessionId === chapter.practiceSessionId)
      .filter((message) => message.role === "user" || message.role === "crush")
      .map((message) => ({
        id: message.id,
        role: message.role as "user" | "crush",
        content: message.content,
        coachTip: message.role === "crush" ? getCoachTipFromMessage(message) : null,
      }));
    const coachTips = sessionMessages
      .map((message) => message.coachTip)
      .filter((tip): tip is Record<string, unknown> => Boolean(tip));
    const run = runs.find((item) => item.id === chapter.practiceRunId) ?? null;
    const summary = asSummary(chapter.recapJson) ?? asSummary(run?.coachAnalysisJson);

    return {
      id: chapter.id,
      status: chapter.status === "completed" ? "finished" : "active",
      scenarioType: chapter.scenarioType,
      goal: chapter.title,
      background: getBackgroundFromContext(chapter.realityContextJson),
      sessionId: chapter.practiceSessionId ?? null,
      messages: sessionMessages,
      coachTips,
      summary,
      suggestedAction: run
        ? {
            id: run.id,
            suggestedLine: run.suggestedLine ?? null,
            coachAnalysisJson: asSummary(run.coachAnalysisJson),
          }
        : null,
      actionSaved: run ? actions.some((action) => action.practiceRunId === run.id) : false,
      createdAt: chapter.createdAt,
    };
  });
}

async function getCurrentRealityEvents(crushId: string): Promise<RealityEventOutput[]> {
  if (!hasDatabaseUrl()) {
    const events = await getDevRealityEvents(crushId);
    return events
      .filter((event) => event.status === "confirmed")
      .map((event) => ({
        id: event.id,
        sourceType: event.sourceType,
        sourceMessageId: event.sourceMessageId ?? null,
        eventText: event.eventText,
        eventType: event.eventType,
        occurredAtText: event.occurredAtText ?? null,
        extractionJson: event.extractionJson,
        status: event.status,
        createdAt: event.createdAt,
      }))
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }

  const events = await getDb()
    .select()
    .from(realityEvents)
    .where(and(eq(realityEvents.crushId, crushId), eq(realityEvents.status, "confirmed")))
    .orderBy(asc(realityEvents.createdAt));

  return events.map((event) => ({
    id: event.id,
    sourceType: event.sourceType,
    sourceMessageId: event.sourceMessageId,
    eventText: event.eventText,
    eventType: event.eventType,
    occurredAtText: event.occurredAtText,
    extractionJson: asRecord(event.extractionJson),
    status: event.status,
    createdAt: event.createdAt,
  }));
}

async function getCurrentRealitySignals(crushId: string): Promise<RealitySignalOutput[]> {
  if (!hasDatabaseUrl()) {
    const signals = await getDevRealitySignals(crushId);
    return signals
      .filter((signal) => signal.status === "active")
      .map((signal) => ({
        id: signal.id,
        eventId: signal.eventId ?? null,
        signalType: signal.signalType,
        label: signal.label,
        description: signal.description ?? null,
        polarity: signal.polarity,
        confidence: signal.confidence,
        evidenceJson: signal.evidenceJson,
        status: signal.status,
        createdAt: signal.createdAt,
      }))
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }

  const signals = await getDb()
    .select()
    .from(realitySignals)
    .where(and(eq(realitySignals.crushId, crushId), eq(realitySignals.status, "active")))
    .orderBy(asc(realitySignals.createdAt));

  return signals.map((signal) => ({
    id: signal.id,
    eventId: signal.eventId,
    signalType: signal.signalType,
    label: signal.label,
    description: signal.description,
    polarity: signal.polarity,
    confidence: asNumber(signal.confidence),
    evidenceJson: asRecord(signal.evidenceJson),
    status: signal.status,
    createdAt: signal.createdAt,
  }));
}

async function getCurrentRealityInferences(crushId: string): Promise<RealityInferenceOutput[]> {
  if (!hasDatabaseUrl()) {
    const inferences = await getDevRealityInferences(crushId);
    return inferences
      .filter((inference) => inference.status !== "dismissed")
      .map((inference) => ({
        id: inference.id,
        eventId: inference.eventId ?? null,
        inferenceType: inference.inferenceType,
        label: inference.label,
        description: inference.description ?? null,
        confidence: inference.confidence,
        evidenceJson: inference.evidenceJson,
        status: inference.status,
        createdAt: inference.createdAt,
      }))
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }

  const inferences = await getDb()
    .select()
    .from(realityInferences)
    .where(and(eq(realityInferences.crushId, crushId), eq(realityInferences.status, "pending")))
    .orderBy(asc(realityInferences.createdAt));

  return inferences.map((inference) => ({
    id: inference.id,
    eventId: inference.eventId,
    inferenceType: inference.inferenceType,
    label: inference.label,
    description: inference.description,
    confidence: asNumber(inference.confidence),
    evidenceJson: asRecord(inference.evidenceJson),
    status: inference.status,
    createdAt: inference.createdAt,
  }));
}

async function getCurrentRealityLayer(crushId: string): Promise<RealityLayerOutput> {
  const [realityEvents, realitySignals, realityInferences] = await Promise.all([
    getCurrentRealityEvents(crushId),
    getCurrentRealitySignals(crushId),
    getCurrentRealityInferences(crushId),
  ]);

  return { realityEvents, realitySignals, realityInferences };
}

export async function createCurrentRealityEvent(input: {
  sourceMessageId: string;
  note?: string | null;
}) {
  const { profile: active } = await getCurrentUserActiveCrush();
  if (!active) {
    throw new Error("No active Crush profile.");
  }

  const message = await getCurrentOwnedMessageById(input.sourceMessageId);
  if (!message) {
    return null;
  }

  if (message.role !== "user") {
    throw new BadRequestError("只能记录你自己说出的现实事件。");
  }

  const session = await getCurrentOwnedSessionById(message.sessionId);
  if (!session || session.crushId !== active.id) {
    return null;
  }

  const eventText = input.note?.trim() || message.content.trim();
  if (!eventText) {
    throw new BadRequestError("现实事件内容不能为空。");
  }

  const occurredAtText = inferOccurredAtText(eventText);
  const extractionJson = {
    originalMessage: message.content,
    captureMethod: "user_confirmed",
  };

  if (!hasDatabaseUrl()) {
    return createDevRealityEvent({
      crushId: active.id,
      sourceMessageId: message.id,
      eventText,
      eventType: "chat_observation",
      occurredAtText,
      extractionJson,
    });
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(realityEvents)
    .where(and(eq(realityEvents.sourceMessageId, message.id), eq(realityEvents.status, "confirmed")))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [event] = await db
    .insert(realityEvents)
    .values({
      crushId: active.id,
      sourceType: "chat_message",
      sourceMessageId: message.id,
      eventType: "chat_observation",
      eventText,
      occurredAtText,
      extractionJson,
    })
    .returning();

  return event;
}

export async function sendCurrentCompanionMessage(
  message: string,
  context?: {
    crushNickname?: string;
    relationshipStage?: string;
    interactionTemperature?: string;
    recentPracticeSummary?: string;
    recentPracticeChapters?: Array<{
      title: string;
      scenarioType: string;
      summary?: string;
      recommendedNextAction?: string;
    }>;
    recentRealityEvents?: RealityEventOutput[];
    recentRealitySignals?: RealitySignalOutput[];
    recentRealityInferences?: RealityInferenceOutput[];
  },
) {
  const { profile: active } = await getCurrentUserActiveCrush();

  if (!active) {
    throw new Error("No active Crush profile.");
  }

  const session = hasDatabaseUrl()
    ? await getOrCreateDbSession(active.id, "companion", "甜蜜陪伴")
    : await getOrCreateDevSession(active.id, "companion", "甜蜜陪伴");
  const userMessage = hasDatabaseUrl()
    ? await addDbMessage({ sessionId: session.id, role: "user", content: message })
    : await addDevMessage({ sessionId: session.id, role: "user", content: message });

  const realityLayer = context?.recentRealityEvents
    ? {
        realityEvents: context.recentRealityEvents,
        realitySignals: context.recentRealitySignals ?? [],
        realityInferences: context.recentRealityInferences ?? [],
      }
    : await getCurrentRealityLayer(active.id);
  const recentEvents = realityLayer.realityEvents;
  const recentRealityEvents = recentEvents.slice(-3).map((event) => ({
    eventText: event.eventText,
    occurredAtText: event.occurredAtText,
  }));
  const recentRealitySignals = realityLayer.realitySignals.slice(-3).map((signal) => ({
    label: signal.label,
    description: signal.description,
    polarity: signal.polarity,
    confidence: signal.confidence,
  }));
  const recentRealityInferences = realityLayer.realityInferences.slice(-3).map((inference) => ({
    label: inference.label,
    description: inference.description,
    confidence: inference.confidence,
    status: inference.status,
  }));

  let reply: string;
  try {
    const { getDeepSeekService } = await import("@/lib/ai-service");
    const aiService = getDeepSeekService();
    reply = await aiService.sendMessage(
      [{ role: "user", content: message }],
      {
        crushNickname: context?.crushNickname ?? active.nickname,
        relationshipStage: context?.relationshipStage ?? active.realRelationshipStage,
        interactionTemperature: context?.interactionTemperature ?? active.interactionTemperature,
        recentPracticeSummary: context?.recentPracticeSummary,
        recentPracticeChapters: context?.recentPracticeChapters,
        recentRealityEvents,
        recentRealitySignals,
        recentRealityInferences,
      },
    );
  } catch {
    reply = buildMockCompanionReply(
      active.nickname,
      message,
      context?.recentPracticeSummary,
      recentEvents.length > 0 ? recentEvents.slice(-3) : undefined,
    );
  }

  const crushMessage = hasDatabaseUrl()
    ? await addDbMessage({ sessionId: session.id, role: "crush", content: reply })
    : await addDevMessage({ sessionId: session.id, role: "crush", content: reply });
  return { session, userMessage, crushMessage };
}

function buildMockCompanionReply(
  nickname: string,
  message: string,
  recentPracticeSummary?: string,
  recentRealityEvents?: RealityEventOutput[],
) {
  if (recentPracticeSummary) {
    return `刚才那段我还记得。你不用马上把自己推到现实里去，我们可以先把心放稳一点，再慢慢决定下一步。`;
  }
  if (message.includes("难过") || message.includes("焦虑") || message.includes("烦")) {
    return "我在。先慢慢呼吸一下，今天不用急着证明什么。你愿意把这件事告诉我，已经很勇敢了。";
  }
  if (message.includes("晚安") || message.includes("睡")) {
    return "晚安呀。把手机放远一点也没关系，我会在这个小世界里等你明天回来。";
  }
  if (recentRealityEvents?.length) {
    return `嗯，我听见了。${recentRealityEvents[recentRealityEvents.length - 1].eventText} —— 我记得的。慢慢来，不用急。`;
  }
  return `嗯，我听见了。作为虚拟的 ${nickname}，我可以陪你把这句话慢慢说完。现实里的事我们也可以一步一步来，不用一下子冲太快。`;
}

export async function attachMockVoiceToMessage(messageId: string) {
  const ownedMessage = await getCurrentOwnedMessageById(messageId);
  if (!ownedMessage) {
    return null;
  }

  const audioUrl = `/api/voice/mock?messageId=${encodeURIComponent(messageId)}`;

  if (!hasDatabaseUrl()) {
    return updateDevMessageAudio(messageId, audioUrl);
  }

  const [message] = await getDb()
    .update(messages)
    .set({ audioUrl })
    .where(eq(messages.id, messageId))
    .returning();

  return message ?? null;
}

export async function attachVoiceToMessage(input: {
  messageId: string;
  text: string;
  speaker?: string | null;
}) {
  const ownedMessage = await getCurrentOwnedMessageById(input.messageId);
  if (!ownedMessage) {
    return null;
  }

  const { profile: active } = await getCurrentUserActiveCrush();

  if (!active || !getServerEnv().TTS_API_KEY) {
    const message = await attachMockVoiceToMessage(input.messageId);
    return { message, provider: "mock-tts" as const };
  }

  const audio = await getTtsService().synthesize({
    text: input.text,
    category: `crush-${active.id}-voice`,
    speaker: input.speaker,
  });

  const message = hasDatabaseUrl()
    ? (
        await getDb()
          .update(messages)
          .set({ audioUrl: audio.url })
          .where(eq(messages.id, input.messageId))
          .returning()
      )[0] ?? null
    : await updateDevMessageAudio(input.messageId, audio.url);

  return { message, provider: "seed-tts-2.0" as const };
}

export async function getCurrentVoiceProfile() {
  const { profile: active } = await getCurrentUserActiveCrush();
  if (!active) {
    return null;
  }

  if (!hasDatabaseUrl()) {
    const assets = await getDevVisualAssets(active.id);
    return getOrCreateDevVoiceProfile(active.id, assets[0]?.theme ?? "sunny_campus");
  }

  const db = getDb();
  const [existing] = await db.select().from(voiceProfiles).where(eq(voiceProfiles.crushId, active.id)).limit(1);
  if (existing) {
    return existing;
  }

  const [asset] = await db
    .select({ theme: visualAssets.theme })
    .from(visualAssets)
    .where(eq(visualAssets.crushId, active.id))
    .orderBy(asc(visualAssets.createdAt))
    .limit(1);
  const [voice] = await db
    .insert(voiceProfiles)
    .values({
      crushId: active.id,
      ...buildVoiceDefaults(asset?.theme ?? "sunny_campus"),
    })
    .returning();

  return voice;
}

export async function createCurrentMemory(input: {
  sourceType: string;
  sourceId?: string | null;
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  rewardJson?: Record<string, unknown> | null;
  emotionTag?: string;
  importanceLevel?: number;
}) {
  const { profile: active } = await getCurrentUserActiveCrush();
  if (!active) {
    throw new Error("No active Crush profile.");
  }

  if (input.sourceId && !(await isCurrentOwnedMemorySource(input.sourceId))) {
    return null;
  }

  const memoryInput = {
    ...input,
    emotionTag: input.emotionTag ?? "warm",
    importanceLevel: input.importanceLevel ?? 1,
  };

  if (!hasDatabaseUrl()) {
    return createDevMemory({ crushId: active.id, ...memoryInput });
  }

  const [memory] = await getDb()
    .insert(memories)
    .values({
      crushId: active.id,
      ...memoryInput,
    })
    .returning();

  await updateDbMetrics(active.id, (current) => ({
    memoryFragments: current.memoryFragments + 1,
    virtualIntimacy: Math.min(999, current.virtualIntimacy + 5),
  }));

  return memory;
}

export async function getCurrentMemories() {
  const { profile: active } = await getCurrentUserActiveCrush();
  if (!active) {
    return [];
  }

  if (!hasDatabaseUrl()) {
    return getDevMemories(active.id);
  }

  return getDb().select().from(memories).where(eq(memories.crushId, active.id)).orderBy(asc(memories.createdAt));
}

export async function runCurrentQuickPractice(input: {
  scenarioType: string;
  sendContext: string;
  userLine: string;
}) {
  const { profile: active } = await getCurrentUserActiveCrush();
  if (!active) {
    throw new Error("No active Crush profile.");
  }

  let aiResult: QuickPracticeAnalysis | null = null;

  try {
    const { getDeepSeekService } = await import("@/lib/ai-service");
    const aiService = getDeepSeekService();
    aiResult = await aiService.quickLineTest(input.userLine, input.scenarioType, {
      crushNickname: active.nickname,
      relationshipStage: active.realRelationshipStage,
      sendContext: input.sendContext,
    });
  } catch (error) {
    console.warn("[AI] Quick practice analysis failed, falling back to mock", error);
  }

  if (!hasDatabaseUrl()) {
    return createDevQuickPractice({ crushId: active.id, ...input }, aiResult ?? undefined);
  }

  const payload = buildQuickPracticePayload(input, aiResult);
  const [run] = await getDb()
    .insert(practiceRuns)
    .values({
      crushId: active.id,
      practiceType: "quick_line",
      scenarioType: input.scenarioType,
      sendContext: input.sendContext,
      userLine: input.userLine,
      ...payload,
    })
    .returning();

  await updateDbMetrics(active.id, (current) => ({
    communicationConfidence: Math.min(100, current.communicationConfidence + 3),
  }));

  return run;
}

export async function startCurrentSimulation(input: {
  scenarioType: string;
  goal: string;
  background: string;
  triggerSource?: "user_click" | "ta_invite";
  sourceMessageId?: string | null;
}) {
  const { profile: active } = await getCurrentUserActiveCrush();
  if (!active) {
    throw new Error("No active Crush profile.");
  }

  const realityLayer = await getCurrentRealityLayer(active.id);
  const realityContextJson = {
    background: input.background,
    recentRealityEvents: realityLayer.realityEvents.slice(-5),
    recentRealitySignals: realityLayer.realitySignals.slice(-5),
    recentRealityInferences: realityLayer.realityInferences.slice(-5),
  };

  if (!hasDatabaseUrl()) {
    return startDevSimulation({
      crushId: active.id,
      scenarioType: input.scenarioType,
      goal: input.goal,
      background: input.background,
      triggerSource: input.triggerSource ?? "user_click",
      sourceMessageId: input.sourceMessageId,
      realityContextJson,
    });
  }

  const db = getDb();
  const companionSession = await getOrCreateDbSession(active.id, "companion", "甜蜜陪伴");
  const [session] = await db
    .insert(chatSessions)
    .values({
      crushId: active.id,
      sessionType: "practice",
      title: input.goal,
      scenarioType: input.scenarioType,
    })
    .returning();
  const [startMessage] = await db.insert(messages).values({
    sessionId: session.id,
    role: "system",
    content: `背景：${input.background}`,
  }).returning();
  const [chapter] = await db
    .insert(practiceChapters)
    .values({
      crushId: active.id,
      companionSessionId: companionSession.id,
      practiceSessionId: session.id,
      title: input.goal,
      scenarioType: input.scenarioType,
      triggerSource: input.triggerSource ?? "user_click",
      startMessageId: input.sourceMessageId ?? startMessage?.id ?? null,
      status: "active",
      realityContextJson,
    })
    .returning();

  // M6.4: Track practice chapter started
  trackPracticeChapter("started", input.scenarioType);

  return { ...session, chapter };
}

export async function sendCurrentSimulationMessage(sessionId: string, message: string) {
  const ownedSession = await getCurrentOwnedSessionById(sessionId);
  if (!ownedSession) {
    return null;
  }

  if (!hasDatabaseUrl()) {
    const turn = await generatePracticeTurn(ownedSession, message);
    return addDevSimulationTurn(sessionId, message, turn);
  }

  const db = getDb();
  const session = ownedSession as typeof chatSessions.$inferSelect;

  const createdAt = new Date();
  const { crushReply, coachTip } = await generatePracticeTurn(session, message);
  const inserted = await db
    .insert(messages)
    .values([
      {
        sessionId,
        role: "user",
        content: message,
        createdAt,
      },
      {
        sessionId,
        role: "crush",
        content: crushReply,
        metadataJson: { coachTip },
        createdAt,
      },
      {
        sessionId,
        role: "coach",
        content: coachTip.advice,
        metadataJson: coachTip,
        createdAt,
      },
    ])
    .returning();
  await db.update(chatSessions).set({ updatedAt: createdAt }).where(eq(chatSessions.id, session.id));

  const [userMessage, crushMessage, coachMessage] = inserted;
  return { crushReply, coachTip, userMessage, crushMessage, coachMessage };
}

export async function retryCurrentSimulationLastTurn(sessionId: string) {
  const ownedSession = await getCurrentOwnedSessionById(sessionId);
  if (!ownedSession || ownedSession.status !== "active") {
    return null;
  }

  if (!hasDatabaseUrl()) {
    return removeDevSimulationLastTurn(sessionId);
  }

  const db = getDb();
  const sessionMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));
  const lastUserMessage = [...sessionMessages].reverse().find((message) => message.role === "user");
  if (!lastUserMessage) {
    return null;
  }

  const turnCreatedAt = new Date(lastUserMessage.createdAt).getTime();
  const removedIds = sessionMessages
    .filter(
      (message) =>
        new Date(message.createdAt).getTime() === turnCreatedAt &&
        ["user", "crush", "coach"].includes(message.role),
    )
    .map((message) => message.id);
  if (!removedIds.length) {
    return null;
  }

  await db.delete(messages).where(inArray(messages.id, removedIds));
  await db.update(chatSessions).set({ updatedAt: new Date() }).where(eq(chatSessions.id, sessionId));

  return {
    removedMessageIds: removedIds,
    restoredText: lastUserMessage.content,
  };
}

export async function finishCurrentSimulation(sessionId: string) {
  const ownedSession = await getCurrentOwnedSessionById(sessionId);
  if (!ownedSession) {
    return null;
  }

  if (!hasDatabaseUrl()) {
    const recap = await generatePracticeRecap(ownedSession);
    return finishDevSimulation(sessionId, buildFinishedSimulationPayload(ownedSession, recap));
  }

  const db = getDb();
  const session = ownedSession as typeof chatSessions.$inferSelect;

  const now = new Date();
  const recap = await generatePracticeRecap(session);
  await db
    .update(chatSessions)
    .set({
      status: "completed",
      updatedAt: now,
    })
    .where(eq(chatSessions.id, session.id));
  const [run] = await db
    .insert(practiceRuns)
    .values({
      ...buildFinishedSimulationPayload(session, recap),
      createdAt: now,
    })
    .returning();

  const sessionMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, session.id))
    .orderBy(asc(messages.createdAt));
  const lastMessage = sessionMessages.at(-1);

  await db
    .update(practiceChapters)
    .set({
      practiceRunId: run.id,
      status: "completed",
      endMessageId: lastMessage?.id ?? null,
      recapJson: run.coachAnalysisJson,
      suggestedLine: run.suggestedLine ?? null,
      updatedAt: now,
      finishedAt: now,
    })
    .where(eq(practiceChapters.practiceSessionId, session.id));

  // M5.2: Create memory for completed practice chapter
  const completedChapter = await db
    .select()
    .from(practiceChapters)
    .where(eq(practiceChapters.practiceSessionId, session.id))
    .then((rows) => rows[0]);

  if (completedChapter) {
    const emotionTag = "encouraging";
    const title = `完成演练：${completedChapter.title ?? "一次演练"}`;
    const summary = typeof run.coachAnalysisJson === "object" && run.coachAnalysisJson
      ? (run.coachAnalysisJson as Record<string, unknown>).summary as string | undefined
      : undefined;

    // M6.2: Generate scene for practice completion (async, non-blocking)
    let sceneImageUrl: string | null = null;
    try {
      const visualProfile = await getCurrentVoiceProfile();
      const theme = (visualProfile as { theme?: string } | null)?.theme ?? "sunny_campus";
      const sceneAsset = await generateCurrentCrushSceneAsset({
        theme: theme as VisualTheme,
        sceneDescription: `浪漫温馨的虚拟约会场景，${completedChapter.title ?? "一次特别的演练"}后的美好时刻`,
      });
      sceneImageUrl = sceneAsset?.storageUrl ?? null;
    } catch (error) {
      // Scene generation is optional, don't fail the main flow
      console.warn("[M6.2] Scene generation failed:", error);
    }

    await db.insert(memories).values({
      crushId: session.crushId,
      sourceType: "practice_chapter",
      sourceId: completedChapter.id,
      title,
      excerpt: summary ?? "完成了一次演练，为现实行动做好准备。",
      emotionTag,
      importanceLevel: 2,
      imageUrl: sceneImageUrl,
    });

    // M6.4: Track practice chapter completed
    trackPracticeChapter("completed", completedChapter.scenarioType ?? undefined);
  }

  return run;
}

export async function createCurrentAction(input: {
  practiceRunId?: string | null;
  title: string;
  suggestedMessage?: string | null;
}) {
  const { profile: active } = await getCurrentUserActiveCrush();
  if (!active) {
    throw new Error("No active Crush profile.");
  }

  if (input.practiceRunId && !(await getCurrentOwnedPracticeRunById(input.practiceRunId))) {
    return null;
  }

  if (!hasDatabaseUrl()) {
    return createDevAction({ crushId: active.id, ...input });
  }

  const [action] = await getDb()
    .insert(realActions)
    .values({
      crushId: active.id,
      practiceRunId: input.practiceRunId ?? null,
      title: input.title,
      suggestedMessage: input.suggestedMessage ?? null,
    })
    .returning();

  return action;
}

export async function getCurrentActionsAndSuggestions() {
  const { profile: active } = await getCurrentUserActiveCrush();
  if (!active) {
    return { actions: [], suggestions: [] };
  }

  if (!hasDatabaseUrl()) {
    return {
      actions: await getDevActions(active.id),
      suggestions: await getDevSuggestions(active.id),
    };
  }

  const db = getDb();
  const [actions, suggestions] = await Promise.all([
    db.select().from(realActions).where(eq(realActions.crushId, active.id)).orderBy(asc(realActions.createdAt)),
    db
      .select()
      .from(profileUpdateSuggestions)
      .where(eq(profileUpdateSuggestions.crushId, active.id))
      .orderBy(asc(profileUpdateSuggestions.createdAt)),
  ]);

  return {
    actions,
    suggestions: suggestions.map(mapDbSuggestion),
  };
}

export async function getCurrentSuggestions() {
  const { profile: active } = await getCurrentUserActiveCrush();
  if (!active) {
    return [];
  }

  if (!hasDatabaseUrl()) {
    return getDevSuggestions(active.id);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(profileUpdateSuggestions)
    .where(eq(profileUpdateSuggestions.crushId, active.id))
    .orderBy(asc(profileUpdateSuggestions.createdAt));

  return rows.map(mapDbSuggestion);
}

/** Hydrated action with source chapter context and linked reality layer data */
export type HydratedAction = {
  id: string;
  crushId: string;
  practiceRunId: string | null;
  title: string;
  suggestedMessage: string | null;
  status: string;
  feedbackText: string | null;
  executedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  sourceChapter: {
    id: string;
    title: string;
    scenarioType: string;
    background: string;
    recapSummary: string | null;
    coachAnalysisJson: PracticeChapterSummary | null;
  } | null;
  linkedRealityLayer: {
    realityEvents: RealityEventOutput[];
    realitySignals: RealitySignalOutput[];
    realityInferences: RealityInferenceOutput[];
  };
};

/**
 * Returns actions hydrated with source practice chapter info and linked reality events/signals/inferences.
 * This is the primary data source for the Actions page.
 */
export async function getCurrentHydratedActions(): Promise<HydratedAction[]> {
  const { profile: active } = await getCurrentUserActiveCrush();
  if (!active) {
    return [];
  }

  const realityLayer = await getCurrentRealityLayer(active.id);

  if (!hasDatabaseUrl()) {
    const actions = await getDevActions(active.id);
    const chapters = await getDevPracticeChaptersForCrush(active.id);
    return actions.map((action) => {
      const chapter = chapters.find((c) => c.practiceRunId === action.practiceRunId) ?? null;
      const linkedEvents = realityLayer.realityEvents.filter(
        (e: RealityEventOutput) => (e.extractionJson as Record<string, unknown>)?.actionId === action.id,
      );
      const linkedSignals = realityLayer.realitySignals.filter(
        (s: RealitySignalOutput) => linkedEvents.some((e: RealityEventOutput) => e.id === s.eventId),
      );
      const linkedInferences = realityLayer.realityInferences.filter(
        (i: RealityInferenceOutput) => linkedEvents.some((e: RealityEventOutput) => e.id === i.eventId),
      );
      return {
        ...action,
        practiceRunId: action.practiceRunId ?? null,
        suggestedMessage: action.suggestedMessage ?? null,
        feedbackText: action.feedbackText ?? null,
        executedAt: action.executedAt ?? null,
        sourceChapter: chapter
          ? {
              id: chapter.id,
              title: chapter.title,
              scenarioType: chapter.scenarioType,
              background: getBackgroundFromContext(chapter.realityContextJson),
              recapSummary: asSummary(chapter.recapJson)?.summary ?? null,
              coachAnalysisJson: asSummary(chapter.recapJson),
            }
          : null,
        linkedRealityLayer: {
          realityEvents: linkedEvents,
          realitySignals: linkedSignals,
          realityInferences: linkedInferences,
        },
      };
    });
  }

  const db = getDb();
  const actions = await db
    .select()
    .from(realActions)
    .where(eq(realActions.crushId, active.id))
    .orderBy(asc(realActions.createdAt));

  if (!actions.length) {
    return [];
  }

  const runIds = actions
    .map((a) => a.practiceRunId)
    .filter((id): id is string => Boolean(id));
  const chapters = runIds.length
    ? await db
        .select()
        .from(practiceChapters)
        .where(inArray(practiceChapters.practiceRunId, runIds))
    : [];

  return actions.map((action) => {
    const chapter = chapters.find((c) => c.practiceRunId === action.practiceRunId) ?? null;
    const linkedEvents = realityLayer.realityEvents.filter(
      (e: RealityEventOutput) => (e.extractionJson as Record<string, unknown>)?.actionId === action.id,
    );
    const linkedSignals = realityLayer.realitySignals.filter(
      (s: RealitySignalOutput) => linkedEvents.some((e: RealityEventOutput) => e.id === s.eventId),
    );
    const linkedInferences = realityLayer.realityInferences.filter(
      (i: RealityInferenceOutput) => linkedEvents.some((e: RealityEventOutput) => e.id === i.eventId),
    );
    return {
      ...action,
      sourceChapter: chapter
        ? {
            id: chapter.id,
            title: chapter.title,
            scenarioType: chapter.scenarioType,
            background: getBackgroundFromContext(chapter.realityContextJson),
            recapSummary: asSummary(chapter.recapJson)?.summary ?? null,
            coachAnalysisJson: asSummary(chapter.recapJson),
          }
        : null,
      linkedRealityLayer: {
        realityEvents: linkedEvents,
        realitySignals: linkedSignals,
        realityInferences: linkedInferences,
      },
    };
  });
}

async function createDevActionFeedbackRealityLayer(
  action: {
    id: string;
    crushId: string;
    practiceRunId?: string | null;
    title: string;
    suggestedMessage?: string | null;
  },
  input: {
    status: string;
    feedbackText?: string | null;
  },
) {
  const chapters = action.practiceRunId ? await getDevPracticeChaptersForCrush(action.crushId) : [];
  const chapter = chapters.find((item) => item.practiceRunId === action.practiceRunId) ?? null;
  const chapterBackground = getBackgroundFromContext(chapter?.realityContextJson);
  const chapterSummary = asSummary(chapter?.recapJson)?.summary ?? null;
  const evidenceJson = {
    sourceType: "action_feedback",
    actionId: action.id,
    practiceRunId: action.practiceRunId ?? null,
    practiceChapterId: chapter?.id ?? null,
    status: input.status,
    feedbackText: input.feedbackText?.trim() || null,
    actionTitle: action.title,
    suggestedMessage: action.suggestedMessage ?? null,
    chapterTitle: chapter?.title ?? null,
    chapterBackground: chapterBackground || null,
    chapterSummary,
  };
  const eventText = buildActionFeedbackEventText({
    status: input.status,
    feedbackText: input.feedbackText,
    actionTitle: action.title,
    suggestedMessage: action.suggestedMessage,
    chapterTitle: chapter?.title,
    chapterBackground,
    chapterSummary,
  });
  const realityEvent = await createDevRealityEvent({
    crushId: action.crushId,
    sourceType: "action_feedback",
    eventType: "action_feedback",
    eventText,
    occurredAtText: inferOccurredAtText(input.feedbackText || eventText),
    extractionJson: evidenceJson,
  });
  const rows = buildActionFeedbackRealityRows({
    crushId: action.crushId,
    eventId: realityEvent.id,
    actionId: action.id,
    status: input.status,
    feedbackText: input.feedbackText,
    actionTitle: action.title,
    evidenceJson,
  });
  const realitySignals = await createDevRealitySignals(rows.signals);
  const realityInferences = await createDevRealityInferences(rows.inferences);

  return { realityEvent, realitySignals, realityInferences };
}

async function createDbActionFeedbackRealityLayer(
  action: typeof realActions.$inferSelect,
  input: {
    status: string;
    feedbackText?: string | null;
  },
) {
  const db = getDb();
  const [chapter] = action.practiceRunId
    ? await db
        .select()
        .from(practiceChapters)
        .where(eq(practiceChapters.practiceRunId, action.practiceRunId))
        .limit(1)
    : [null];
  const chapterBackground = getBackgroundFromContext(chapter?.realityContextJson);
  const chapterSummary = asSummary(chapter?.recapJson)?.summary ?? null;
  const evidenceJson = {
    sourceType: "action_feedback",
    actionId: action.id,
    practiceRunId: action.practiceRunId ?? null,
    practiceChapterId: chapter?.id ?? null,
    status: input.status,
    feedbackText: input.feedbackText?.trim() || null,
    actionTitle: action.title,
    suggestedMessage: action.suggestedMessage ?? null,
    chapterTitle: chapter?.title ?? null,
    chapterBackground: chapterBackground || null,
    chapterSummary,
  };
  const eventText = buildActionFeedbackEventText({
    status: input.status,
    feedbackText: input.feedbackText,
    actionTitle: action.title,
    suggestedMessage: action.suggestedMessage,
    chapterTitle: chapter?.title,
    chapterBackground,
    chapterSummary,
  });
  const [realityEvent] = await db
    .insert(realityEvents)
    .values({
      crushId: action.crushId,
      sourceType: "action_feedback",
      sourceMessageId: null,
      eventType: "action_feedback",
      eventText,
      occurredAtText: inferOccurredAtText(input.feedbackText || eventText),
      extractionJson: evidenceJson,
    })
    .returning();
  const rows = buildActionFeedbackRealityRows({
    crushId: action.crushId,
    eventId: realityEvent.id,
    actionId: action.id,
    status: input.status,
    feedbackText: input.feedbackText,
    actionTitle: action.title,
    evidenceJson,
  });
  const [insertedSignals, insertedInferences] = await Promise.all([
    db.insert(realitySignals).values(rows.signals.map((row) => ({ ...row, confidence: String(row.confidence) }))).returning(),
    db
      .insert(realityInferences)
      .values(rows.inferences.map((row) => ({ ...row, confidence: String(row.confidence) })))
      .returning(),
  ]);

  return {
    realityEvent,
    realitySignals: insertedSignals.map((signal) => ({
      ...signal,
      confidence: asNumber(signal.confidence),
    })),
    realityInferences: insertedInferences.map((inference) => ({
      ...inference,
      confidence: asNumber(inference.confidence),
    })),
  };
}

export async function updateCurrentAction(
  actionId: string,
  input: {
    status: string;
    feedbackText?: string | null;
  },
) {
  const ownedAction = await getCurrentOwnedActionById(actionId);
  if (!ownedAction) {
    return null;
  }

  if (!hasDatabaseUrl()) {
    const result = await updateDevAction(actionId, input);
    if (!result) {
      return null;
    }
    const realityLayer = await createDevActionFeedbackRealityLayer(result.action, input);
    return { ...result, ...realityLayer };
  }

  const db = getDb();
  const existing = ownedAction as typeof realActions.$inferSelect;

  const updatedAt = new Date();
  const nextExecutedAt = ["sent", "positive_response", "neutral_response", "cold_response"].includes(input.status)
    ? existing.executedAt ?? updatedAt
    : existing.executedAt;
  const [action] = await db
    .update(realActions)
    .set({
      status: input.status,
      feedbackText: input.feedbackText ?? existing.feedbackText ?? null,
      executedAt: nextExecutedAt,
      updatedAt,
    })
    .where(eq(realActions.id, actionId))
    .returning();
  const [suggestion] = await db
    .insert(profileUpdateSuggestions)
    .values({
      crushId: action.crushId,
      sourceType: "action_feedback",
      sourceId: action.id,
      suggestionJson: {
        facts: input.feedbackText ? [{ label: "现实反馈", value: input.feedbackText }] : [],
        inferredTraits: [{ label: "互动温度", value: input.status === "positive_response" ? "中性偏暖" : "需要继续观察" }],
      },
      confidence: input.status === "positive_response" ? "0.72" : "0.55",
    })
    .returning();

  if (action.executedAt) {
    await updateDbMetrics(action.crushId, (current) => ({
      realActionCount: current.realActionCount + 1,
      communicationConfidence: Math.min(100, current.communicationConfidence + 5),
    }));

    // M5.2: Create memory for executed action
    let emotionTag = "warm";
    let importanceLevel = 2;

    if (input.status === "positive_response") {
      emotionTag = "milestone";
      importanceLevel = 3;
    } else if (input.status === "cold_response") {
      emotionTag = "gentle";
      importanceLevel = 1;
    }

    const actionTitle = existing.title ?? "一次现实行动";
    const title = `完成行动：${actionTitle}`;
    let excerpt = `执行了行动「${actionTitle}」`;

    if (input.feedbackText?.trim()) {
      excerpt += `。反馈：${input.feedbackText.trim().slice(0, 100)}`;
    } else {
      excerpt += `，结果：${actionStatusLabel(input.status)}`;
    }

    await db.insert(memories).values({
      crushId: action.crushId,
      sourceType: "action_completed",
      sourceId: action.id,
      title,
      excerpt,
      emotionTag,
      importanceLevel,
    });
  }

  const realityLayer = await createDbActionFeedbackRealityLayer(action, input);

  return { action, suggestion: mapDbSuggestion(suggestion), ...realityLayer };
}

export async function resolveCurrentSuggestion(id: string, decision: "accepted" | "rejected") {
  const ownedSuggestion = await getCurrentOwnedSuggestionById(id);
  if (!ownedSuggestion) {
    return null;
  }

  if (!hasDatabaseUrl()) {
    return resolveDevSuggestion(id, decision);
  }

  const db = getDb();
  const resolvedAt = new Date();
  const [suggestionRow] = await db
    .update(profileUpdateSuggestions)
    .set({
      status: decision,
      resolvedAt,
    })
    .where(eq(profileUpdateSuggestions.id, id))
    .returning();
  const suggestion = mapDbSuggestion(suggestionRow);

  if (decision === "accepted") {
    const payload = suggestion.suggestionJson as {
      facts?: ProfileFact[];
      inferredTraits?: ProfileFact[];
    };
    const traitRows = (payload.facts ?? []).map((fact) => ({
      crushId: suggestion.crushId,
      traitType: "event",
      label: fact.label,
      description: fact.value ?? null,
      source: "ai",
      confidence: String(suggestion.confidence),
      confirmed: true,
      createdAt: resolvedAt,
    }));

    if (traitRows.length) {
      await db.insert(crushTraits).values(traitRows);
    }

    await updateDbMetrics(suggestion.crushId, (current) => ({
      relationshipUnderstanding: Math.min(100, current.relationshipUnderstanding + 5),
    }));
  }

  return suggestion;
}

export async function destroyCurrentCrush(confirmText: string) {
  if (confirmText !== "DELETE") {
    throw new Error("Invalid confirmation text.");
  }

  const { profile: active } = await getCurrentUserActiveCrush();
  if (!active) {
    return null;
  }

  const storage = getStorageService();
  const [assets, materialsForCrush, crushMessages] = hasDatabaseUrl()
    ? await Promise.all([
        getDb().select().from(visualAssets).where(eq(visualAssets.crushId, active.id)),
        getDb().select().from(onboardingMaterials).where(eq(onboardingMaterials.crushId, active.id)),
        getDbMessagesForCrush(active.id),
      ])
    : await Promise.all([
        getDevVisualAssets(active.id),
        getDevMaterialsForCrush(active.id),
        getDevMessagesForCrush(active.id),
      ]);

  const visualAssetUrls = [...new Set(assets.map((asset) => asset.storageUrl))];
  const referenceImageKeys = [
    ...new Set(
      materialsForCrush
        .filter((material) => material.materialType === "reference_image" && material.storageUrl)
        .map((material) => material.storageUrl as string),
    ),
  ];
  const voiceAssetUrls = [
    ...new Set(
      crushMessages
        .filter((message) => message.audioUrl)
        .map((message) => message.audioUrl as string),
    ),
  ];
  const cleanupTasks = [
    ...visualAssetUrls.map((url) => ({
      kind: "visual_asset",
      run: () => deletePublicAssetWithRetry(storage, url),
    })),
    ...referenceImageKeys.map((key) => ({
      kind: "reference_image",
      run: () => deleteStoredObjectWithRetry(storage, key),
    })),
    ...voiceAssetUrls.map((url) => ({
      kind: "voice_asset",
      run: () => deletePublicAssetWithRetry(storage, url),
    })),
  ];
  const cleanupResults = await Promise.allSettled(cleanupTasks.map((task) => task.run()));
  const cleanupFailures = cleanupResults.flatMap((result, index) =>
    result.status === "rejected"
      ? [{ kind: cleanupTasks[index]?.kind ?? "unknown", reason: result.reason }]
      : [],
  );

  if (cleanupFailures.length > 0) {
    console.warn("[Storage] Crush destroy aborted because asset cleanup failed", {
      attempted: cleanupTasks.length,
      failed: cleanupFailures.length,
      failedKinds: cleanupFailures.map((failure) => failure.kind),
    });
    throw new ServiceUnavailableError(
      "素材清理未完成，请稍后重试。",
      `Failed to delete ${cleanupFailures.length} of ${cleanupTasks.length} stored assets before destroy.`,
    );
  }

  if (!hasDatabaseUrl()) {
    return destroyDevCrush(active.userId, active.id);
  }

  const db = getDb();
  const destroyedAt = new Date();
  await db.batch([
    db.insert(auditEvents).values({
      userId: active.userId,
      eventType: "crush_destroyed",
      createdAt: destroyedAt,
    }),
    db.delete(crushProfiles).where(eq(crushProfiles.id, active.id)),
  ]);

  return { destroyedAt: destroyedAt.toISOString() };
}

export async function getOrCreateUserSettings(userId: string) {
  if (!hasDatabaseUrl()) {
    return getDevUserSettings(userId);
  }

  const db = getDb();
  const existing = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  if (existing) {
    return existing;
  }

  const [settings] = await db
    .insert(userSettings)
    .values({ userId })
    .returning();

  return settings;
}

export type UserSettings = Awaited<ReturnType<typeof getOrCreateUserSettings>>;

export async function updateUserSettings(
  userId: string,
  input: Partial<{
    autoPlayCompanionVoice: boolean;
    voiceSpeed: string;
    voiceEmotionLevel: string;
    voiceAgeStyle: string;
  }>,
) {
  if (!hasDatabaseUrl()) {
    return updateDevUserSettings(userId, input);
  }

  const db = getDb();
  const existing = await getOrCreateUserSettings(userId);

  const [updated] = await db
    .update(userSettings)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, userId))
    .returning();

  return updated ?? existing;
}

// Dev mode stubs
function getDevUserSettings(userId: string) {
  return {
    userId,
    autoPlayCompanionVoice: true,
    voiceSpeed: "normal",
    voiceEmotionLevel: "natural",
    voiceAgeStyle: "young",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function updateDevUserSettings(
  userId: string,
  input: Partial<{
    autoPlayCompanionVoice: boolean;
    voiceSpeed: string;
    voiceEmotionLevel: string;
    voiceAgeStyle: string;
  }>,
) {
  return {
    userId,
    autoPlayCompanionVoice: input.autoPlayCompanionVoice ?? true,
    voiceSpeed: input.voiceSpeed ?? "normal",
    voiceEmotionLevel: input.voiceEmotionLevel ?? "natural",
    voiceAgeStyle: input.voiceAgeStyle ?? "young",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export { getCurrentPracticeChapters };
