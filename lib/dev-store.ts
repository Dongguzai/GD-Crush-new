import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type DevUser = {
  id: string;
  email?: string | null;
  ageConfirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Auth session for registered users */
export type DevAuthSession = {
  id: string;
  userId: string;
  expiresAt: string;
  revokedAt?: string | null;
  createdAt: string;
  lastSeenAt: string;
};

/** Alias for DevAuthSession for backwards compatibility */
export type DevSession = DevAuthSession;

/** Registered user with email/password */
export type DevRegisteredUser = {
  id: string;
  email: string;
  passwordHash: string;
};

export type DevCrushProfile = {
  id: string;
  userId: string;
  nickname: string;
  relationshipOrigin?: string | null;
  realRelationshipStage: string;
  interactionTemperature: string;
  riskLevel: string;
  userGoal?: string | null;
  userAnxiety?: string | null;
  personalitySummary?: string | null;
  communicationStyle?: string | null;
  aiConfidence?: string | null;
  status: "active" | "archived" | "destroyed";
  createdAt: string;
  updatedAt: string;
};

type DevGrowthMetrics = {
  crushId: string;
  virtualIntimacy: number;
  communicationConfidence: number;
  relationshipUnderstanding: number;
  emotionalStability: number;
  realActionCount: number;
  memoryFragments: number;
  updatedAt: string;
};

type DevAuditEvent = {
  id: string;
  userId: string;
  eventType: string;
  metadataJson?: unknown;
  createdAt: string;
};

export type DevMaterial = {
  id: string;
  crushId: string;
  materialType: string;
  sanitizedText?: string | null;
  storageUrl?: string | null;
  retentionStatus: string;
  createdAt: string;
  deletedAt?: string | null;
};

type DevProfileDraft = {
  id: string;
  crushId: string;
  factsJson: unknown[];
  inferredTraitsJson: unknown[];
  boundariesJson: unknown[];
  recommendedStage: string;
  interactionTemperature: string;
  confidence: number;
  status: "pending" | "confirmed" | "rejected";
  createdAt: string;
  confirmedAt?: string | null;
};

export type DevVisualAsset = {
  id: string;
  crushId: string;
  assetType: string;
  expression?: string | null;
  theme: string;
  visualTagsJson: Record<string, unknown>;
  storageUrl: string;
  promptSnapshot?: string | null;
  createdAt: string;
};

type DevVoiceProfile = {
  id: string;
  crushId: string;
  voiceStyle: string;
  speed: string;
  emotionLevel: string;
  ageStyle: string;
  providerVoiceId?: string | null;
  createdAt: string;
  updatedAt: string;
};

type DevChatSession = {
  id: string;
  crushId: string;
  sessionType: string;
  title?: string | null;
  scenarioType?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type DevMessage = {
  id: string;
  sessionId: string;
  role: "user" | "crush" | "coach" | "system";
  content: string;
  audioUrl?: string | null;
  metadataJson?: unknown;
  createdAt: string;
};

type DevPracticeRun = {
  id: string;
  crushId: string;
  sessionId?: string | null;
  practiceType: string;
  scenarioType: string;
  sendContext?: string | null;
  userLine?: string | null;
  riskLevel: string;
  simulatedReply?: string | null;
  coachAnalysisJson: Record<string, unknown>;
  suggestedLine?: string | null;
  createdAt: string;
};

export type DevPracticeChapter = {
  id: string;
  crushId: string;
  companionSessionId?: string | null;
  practiceSessionId?: string | null;
  practiceRunId?: string | null;
  title: string;
  scenarioType: string;
  triggerSource: string;
  status: "active" | "completed" | "cancelled";
  startMessageId?: string | null;
  endMessageId?: string | null;
  realityContextJson: Record<string, unknown>;
  recapJson: Record<string, unknown>;
  suggestedLine?: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string | null;
};

export type DevRealityEvent = {
  id: string;
  crushId: string;
  sourceType: string;
  sourceMessageId?: string | null;
  eventType: string;
  eventText: string;
  occurredAtText?: string | null;
  extractionJson: Record<string, unknown>;
  status: "confirmed" | "dismissed";
  createdAt: string;
  updatedAt: string;
};

export type DevRealitySignal = {
  id: string;
  crushId: string;
  eventId?: string | null;
  signalType: string;
  label: string;
  description?: string | null;
  polarity: string;
  confidence: number;
  evidenceJson: Record<string, unknown>;
  status: "active" | "dismissed";
  createdAt: string;
  updatedAt: string;
};

export type DevRealityInference = {
  id: string;
  crushId: string;
  eventId?: string | null;
  inferenceType: string;
  label: string;
  description?: string | null;
  confidence: number;
  evidenceJson: Record<string, unknown>;
  status: "pending" | "confirmed" | "dismissed";
  createdAt: string;
  updatedAt: string;
};

type DevRealAction = {
  id: string;
  crushId: string;
  practiceRunId?: string | null;
  title: string;
  suggestedMessage?: string | null;
  status: string;
  feedbackText?: string | null;
  executedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type DevProfileUpdateSuggestion = {
  id: string;
  crushId: string;
  sourceType: string;
  sourceId?: string | null;
  suggestionJson: Record<string, unknown>;
  confidence: number;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  resolvedAt?: string | null;
};

type DevMemory = {
  id: string;
  crushId: string;
  sourceType: string;
  sourceId?: string | null;
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  rewardJson?: Record<string, unknown> | null;
  emotionTag: string;
  importanceLevel: number;
  createdAt: string;
};

type DevStoreData = {
  users: DevUser[];
  crushProfiles: DevCrushProfile[];
  crushTraits: {
    id: string;
    crushId: string;
    traitType: string;
    label: string;
    description?: string | null;
    source: string;
    confidence?: number | null;
    confirmed: boolean;
    createdAt: string;
  }[];
  growthMetrics: DevGrowthMetrics[];
  auditEvents: DevAuditEvent[];
  onboardingMaterials: DevMaterial[];
  aiProfileDrafts: DevProfileDraft[];
  visualAssets: DevVisualAsset[];
  voiceProfiles: DevVoiceProfile[];
  chatSessions: DevChatSession[];
  messages: DevMessage[];
  practiceRuns: DevPracticeRun[];
  practiceChapters: DevPracticeChapter[];
  realityEvents: DevRealityEvent[];
  realitySignals: DevRealitySignal[];
  realityInferences: DevRealityInference[];
  realActions: DevRealAction[];
  profileUpdateSuggestions: DevProfileUpdateSuggestion[];
  memories: DevMemory[];
  /** Auth sessions for registered users */
  authSessions: DevAuthSession[];
  /** Registered users with email/password */
  registeredUsers: DevRegisteredUser[];
};

const storeFileName =
  process.env.DEV_STORE_FILE_NAME?.replace(/[^a-zA-Z0-9._-]/g, "-") ?? "dev-store.json";
const storePath = join(process.cwd(), ".data", storeFileName);

const emptyStore = (): DevStoreData => ({
  users: [],
  crushProfiles: [],
  crushTraits: [],
  growthMetrics: [],
  auditEvents: [],
  onboardingMaterials: [],
  aiProfileDrafts: [],
  visualAssets: [],
  voiceProfiles: [],
  chatSessions: [],
  messages: [],
  practiceRuns: [],
  practiceChapters: [],
  realityEvents: [],
  realitySignals: [],
  realityInferences: [],
  realActions: [],
  profileUpdateSuggestions: [],
  memories: [],
  authSessions: [],
  registeredUsers: [],
});

async function readStore(): Promise<DevStoreData> {
  try {
    const raw = await readFile(storePath, "utf8");
    return { ...emptyStore(), ...(JSON.parse(raw) as Partial<DevStoreData>) };
  } catch {
    return emptyStore();
  }
}

async function writeStore(data: DevStoreData) {
  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(data, null, 2));
}

function now() {
  return new Date().toISOString();
}

export async function ensureDevUser(userId: string): Promise<DevUser> {
  const data = await readStore();
  const existing = data.users.find((user) => user.id === userId);

  if (existing) {
    return existing;
  }

  const createdAt = now();
  const user: DevUser = {
    id: userId,
    email: null,
    ageConfirmedAt: null,
    createdAt,
    updatedAt: createdAt,
  };

  data.users.push(user);
  await writeStore(data);
  return user;
}

export async function confirmDevUserAge(userId: string) {
  const data = await readStore();
  const createdAt = now();
  let user = data.users.find((item) => item.id === userId);

  if (!user) {
    user = {
      id: userId,
      email: null,
      ageConfirmedAt: null,
      createdAt,
      updatedAt: createdAt,
    };
    data.users.push(user);
  }

  user.ageConfirmedAt = createdAt;
  user.updatedAt = createdAt;
  data.auditEvents.push({
    id: crypto.randomUUID(),
    userId,
    eventType: "age_confirmed",
    createdAt,
  });

  await writeStore(data);
  return user;
}

export async function createDevCrush(
  userId: string,
  input: {
    nickname: string;
    relationshipOrigin?: string | null;
    currentStageGuess?: string | null;
    lastInteraction?: string | null;
    userGoal?: string | null;
    userAnxiety?: string | null;
  },
) {
  const data = await readStore();
  const existing = data.crushProfiles.find(
    (profile) => profile.userId === userId && profile.status === "active",
  );

  if (existing) {
    return existing;
  }

  const createdAt = now();
  const profile: DevCrushProfile = {
    id: crypto.randomUUID(),
    userId,
    nickname: input.nickname,
    relationshipOrigin: input.relationshipOrigin ?? null,
    realRelationshipStage: input.currentStageGuess ?? "普通朋友",
    interactionTemperature: "neutral",
    riskLevel: "low",
    userGoal: input.userGoal ?? null,
    userAnxiety: input.userAnxiety ?? null,
    personalitySummary: input.lastInteraction ? `最近互动：${input.lastInteraction}` : null,
    communicationStyle: null,
    aiConfidence: null,
    status: "active",
    createdAt,
    updatedAt: createdAt,
  };

  data.crushProfiles.push(profile);
  data.growthMetrics.push({
    crushId: profile.id,
    virtualIntimacy: 0,
    communicationConfidence: 35,
    relationshipUnderstanding: 20,
    emotionalStability: 40,
    realActionCount: 0,
    memoryFragments: 0,
    updatedAt: createdAt,
  });

  await writeStore(data);
  return profile;
}

export async function getActiveDevCrush(userId: string) {
  const data = await readStore();
  return (
    data.crushProfiles.find((profile) => profile.userId === userId && profile.status === "active") ??
    null
  );
}

export async function getDevGrowthMetrics(crushId: string) {
  const data = await readStore();
  return data.growthMetrics.find((metrics) => metrics.crushId === crushId) ?? null;
}

export async function addDevMaterial(
  crushId: string,
  input: { materialType: string; sanitizedText?: string | null; storageUrl?: string | null },
) {
  const data = await readStore();
  const material: DevMaterial = {
    id: crypto.randomUUID(),
    crushId,
    materialType: input.materialType,
    sanitizedText: input.sanitizedText ?? null,
    storageUrl: input.storageUrl ?? null,
    retentionStatus: input.materialType === "reference_image" ? "temporary" : "retained_summary",
    createdAt: now(),
    deletedAt: null,
  };
  data.onboardingMaterials.push(material);
  await writeStore(data);
  return material;
}

export async function getDevMaterials(crushId: string) {
  const data = await readStore();
  return data.onboardingMaterials.filter((material) => material.crushId === crushId);
}

export async function createDevProfileDraft(
  crushId: string,
  aiAnalysis?: {
    personalityTraits?: string[];
    communicationStyle?: string;
    likes?: string[];
    dislikes?: string[];
    emotionalTone?: string;
  }
) {
  const data = await readStore();
  const profile = data.crushProfiles.find((item) => item.id === crushId);
  const materials = data.onboardingMaterials.filter((item) => item.crushId === crushId);
  const materialText = materials.map((item) => item.sanitizedText).filter(Boolean).join("\n");
  const facts = [
    profile?.relationshipOrigin ? { label: "认识方式", value: profile.relationshipOrigin } : null,
    profile?.personalitySummary ? { label: "最近互动", value: profile.personalitySummary } : null,
    materialText ? { label: "用户补充材料", value: materialText.slice(0, 120) } : null,
  ].filter(Boolean);

  const inferred: { label: string; value: string; confidence: number }[] = [];

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
      confidence: 0.70,
    });
  }
  if (!inferred.length) {
    inferred.push({
      label: "沟通节奏",
      value: materialText.includes("忙") ? "可能需要低频、轻量推进" : "适合先用轻松话题建立舒适度",
      confidence: 0.62,
    });
  }

  const boundaries: { label: string; value: string; confidence: number }[] = [];
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

  const draft: DevProfileDraft = {
    id: crypto.randomUUID(),
    crushId,
    factsJson: facts,
    inferredTraitsJson: inferred,
    boundariesJson: boundaries,
    recommendedStage: profile?.realRelationshipStage ?? "普通朋友",
    interactionTemperature: aiAnalysis?.emotionalTone?.includes("暖") ? "warm" : "neutral",
    confidence: aiAnalysis ? 0.78 : 0.66,
    status: "pending",
    createdAt: now(),
    confirmedAt: null,
  };
  data.aiProfileDrafts.push(draft);
  await writeStore(data);
  return draft;
}

export async function getDevProfileDraft(draftId: string) {
  const data = await readStore();
  return data.aiProfileDrafts.find((draft) => draft.id === draftId) ?? null;
}

export async function isDevCrushOwnedByUser(userId: string, crushId: string) {
  const data = await readStore();
  return data.crushProfiles.some((profile) => profile.id === crushId && profile.userId === userId);
}

export async function confirmDevProfileDraft(
  draftId: string,
  input: {
    acceptedFacts?: { label: string; value?: string }[];
    acceptedTraits?: { label: string; value?: string; confidence?: number }[];
    realRelationshipStage?: string;
    interactionTemperature?: string;
  },
) {
  const data = await readStore();
  const draft = data.aiProfileDrafts.find((item) => item.id === draftId);

  if (!draft) {
    return null;
  }

  const profile = data.crushProfiles.find((item) => item.id === draft.crushId);
  const updatedAt = now();
  draft.status = "confirmed";
  draft.confirmedAt = updatedAt;

  if (profile) {
    profile.realRelationshipStage = input.realRelationshipStage ?? draft.recommendedStage;
    profile.interactionTemperature = input.interactionTemperature ?? draft.interactionTemperature;
    profile.aiConfidence = String(draft.confidence);
    profile.updatedAt = updatedAt;
  }

  const facts = input.acceptedFacts ?? (draft.factsJson as { label: string; value?: string }[]);
  const traits = input.acceptedTraits ?? (draft.inferredTraitsJson as { label: string; value?: string; confidence?: number }[]);
  const boundaries = draft.boundariesJson as { label: string; value?: string; confidence?: number }[];

  for (const fact of facts) {
    data.crushTraits.push({
      id: crypto.randomUUID(),
      crushId: draft.crushId,
      traitType: "fact",
      label: fact.label,
      description: fact.value ?? null,
      source: "ai",
      confidence: 1,
      confirmed: true,
      createdAt: updatedAt,
    });
  }
  for (const trait of traits) {
    data.crushTraits.push({
      id: crypto.randomUUID(),
      crushId: draft.crushId,
      traitType: "style",
      label: trait.label,
      description: trait.value ?? null,
      source: "ai",
      confidence: trait.confidence ?? draft.confidence,
      confirmed: true,
      createdAt: updatedAt,
    });
  }
  for (const boundary of boundaries) {
    data.crushTraits.push({
      id: crypto.randomUUID(),
      crushId: draft.crushId,
      traitType: "boundary",
      label: boundary.label,
      description: boundary.value ?? null,
      source: "ai",
      confidence: boundary.confidence ?? draft.confidence,
      confirmed: true,
      createdAt: updatedAt,
    });
  }

  const metrics = data.growthMetrics.find((item) => item.crushId === draft.crushId);
  if (metrics) {
    metrics.relationshipUnderstanding = Math.min(100, metrics.relationshipUnderstanding + 12);
    metrics.updatedAt = updatedAt;
  }

  await writeStore(data);
  return { draft, profile };
}

export async function getDevTraits(crushId: string) {
  const data = await readStore();
  return data.crushTraits.filter((trait) => trait.crushId === crushId);
}

export async function addDevVisualAssets(
  crushId: string,
  input: {
    theme: string;
    visualTags: Record<string, unknown>;
    referenceImageKey?: string;
  },
  generatedAssets?: Array<{
    assetType: string;
    expression?: string | null;
    storageUrl: string;
    promptSnapshot?: string | null;
  }>,
) {
  const data = await readStore();
  const createdAt = now();
  const base = `/api/mock-character?theme=${encodeURIComponent(input.theme)}&crush=${encodeURIComponent(crushId)}`;
  const assetInputs =
    generatedAssets ??
    [
      { assetType: "avatar", expression: null, storageUrl: `${base}&asset=avatar` },
      { assetType: "portrait", expression: null, storageUrl: `${base}&asset=portrait` },
      { assetType: "expression", expression: "neutral", storageUrl: `${base}&asset=neutral` },
      { assetType: "expression", expression: "happy", storageUrl: `${base}&asset=happy` },
      { assetType: "expression", expression: "shy", storageUrl: `${base}&asset=shy` },
    ];
  const assets: DevVisualAsset[] = assetInputs.map((asset) => ({
    id: crypto.randomUUID(),
    crushId,
    theme: input.theme,
    visualTagsJson: input.visualTags,
    promptSnapshot: asset.promptSnapshot ?? "MVP mock two-dimensional otome character asset",
    createdAt,
    ...asset,
  }));

  data.visualAssets.push(...assets);
  await writeStore(data);
  return assets;
}

export async function markDevReferenceImageDeleted(crushId: string, referenceImageKey: string) {
  const data = await readStore();
  const deletedAt = now();
  const material = data.onboardingMaterials.find(
    (item) =>
      item.crushId === crushId &&
      item.materialType === "reference_image" &&
      item.retentionStatus === "temporary" &&
      item.storageUrl === referenceImageKey,
  );
  if (material) {
    material.retentionStatus = "deleted";
    material.deletedAt = deletedAt;
    data.auditEvents.push({
      id: crypto.randomUUID(),
      userId: data.crushProfiles.find((profile) => profile.id === crushId)?.userId ?? "unknown",
      eventType: "image_deleted",
      createdAt: deletedAt,
    });
  }
  await writeStore(data);
  return material ?? null;
}

export async function getDevVisualAssets(crushId: string) {
  const data = await readStore();
  return data.visualAssets.filter((asset) => asset.crushId === crushId);
}

export async function getDevMaterialsForCrush(crushId: string) {
  const data = await readStore();
  return data.onboardingMaterials.filter((material) => material.crushId === crushId);
}

export async function getOrCreateDevSession(crushId: string, sessionType: string, title?: string) {
  const data = await readStore();
  const existing = data.chatSessions.find(
    (session) => session.crushId === crushId && session.sessionType === sessionType && session.status === "active",
  );

  if (existing) {
    return existing;
  }

  const createdAt = now();
  const session: DevChatSession = {
    id: crypto.randomUUID(),
    crushId,
    sessionType,
    title: title ?? null,
    scenarioType: null,
    status: "active",
    createdAt,
    updatedAt: createdAt,
  };
  data.chatSessions.push(session);
  await writeStore(data);
  return session;
}

export async function getDevMessages(sessionId: string) {
  const data = await readStore();
  return data.messages.filter((message) => message.sessionId === sessionId);
}

export async function getDevMessageById(messageId: string) {
  const data = await readStore();
  return data.messages.find((message) => message.id === messageId) ?? null;
}

export async function getDevChatSessionById(sessionId: string) {
  const data = await readStore();
  return data.chatSessions.find((session) => session.id === sessionId) ?? null;
}

export async function getDevMessagesForCrush(crushId: string) {
  const data = await readStore();
  const sessionIds = new Set(
    data.chatSessions.filter((session) => session.crushId === crushId).map((session) => session.id),
  );
  return data.messages.filter((message) => sessionIds.has(message.sessionId));
}

export async function addDevMessage(input: {
  sessionId: string;
  role: "user" | "crush" | "coach" | "system";
  content: string;
  audioUrl?: string | null;
  metadataJson?: unknown;
}) {
  const data = await readStore();
  const message: DevMessage = {
    id: crypto.randomUUID(),
    sessionId: input.sessionId,
    role: input.role,
    content: input.content,
    audioUrl: input.audioUrl ?? null,
    metadataJson: input.metadataJson,
    createdAt: now(),
  };
  data.messages.push(message);

  const session = data.chatSessions.find((item) => item.id === input.sessionId);
  if (session) {
    session.updatedAt = message.createdAt;
  }

  if (input.role === "crush" && session) {
    const metrics = data.growthMetrics.find((item) => item.crushId === session.crushId);
    if (metrics) {
      metrics.virtualIntimacy = Math.min(999, metrics.virtualIntimacy + 2);
      metrics.emotionalStability = Math.min(100, metrics.emotionalStability + 1);
      metrics.updatedAt = message.createdAt;
    }
  }

  await writeStore(data);
  return message;
}

export async function updateDevMessageAudio(messageId: string, audioUrl: string) {
  const data = await readStore();
  const message = data.messages.find((item) => item.id === messageId);

  if (!message) {
    return null;
  }

  message.audioUrl = audioUrl;
  await writeStore(data);
  return message;
}

export async function createDevMemory(input: {
  crushId: string;
  sourceType: string;
  sourceId?: string | null;
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  rewardJson?: Record<string, unknown> | null;
  emotionTag?: string;
  importanceLevel?: number;
}) {
  const data = await readStore();
  const createdAt = now();
  const memory: DevMemory = {
    id: crypto.randomUUID(),
    createdAt,
    emotionTag: input.emotionTag ?? "warm",
    importanceLevel: input.importanceLevel ?? 1,
    ...input,
  };
  data.memories.push(memory);
  const metrics = data.growthMetrics.find((item) => item.crushId === input.crushId);
  if (metrics) {
    metrics.memoryFragments += 1;
    metrics.virtualIntimacy = Math.min(999, metrics.virtualIntimacy + 5);
    metrics.updatedAt = createdAt;
  }
  await writeStore(data);
  return memory;
}

export async function getDevMemories(crushId: string) {
  const data = await readStore();
  return data.memories.filter((memory) => memory.crushId === crushId);
}

export async function getOrCreateDevVoiceProfile(crushId: string, theme = "sunny_campus") {
  const data = await readStore();
  const existing = data.voiceProfiles.find((profile) => profile.crushId === crushId);
  if (existing) {
    return existing;
  }
  const createdAt = now();
  const voice: DevVoiceProfile = {
    id: crypto.randomUUID(),
    crushId,
    voiceStyle: theme === "dream_otome" ? "romantic" : theme === "city_healing" ? "gentle" : "clear",
    speed: theme === "city_healing" ? "slow" : "normal",
    emotionLevel: theme === "dream_otome" ? "sweet" : "natural",
    ageStyle: "young",
    providerVoiceId: null,
    createdAt,
    updatedAt: createdAt,
  };
  data.voiceProfiles.push(voice);
  await writeStore(data);
  return voice;
}

export async function createDevQuickPractice(
  input: {
    crushId: string;
    scenarioType: string;
    sendContext: string;
    userLine: string;
  },
  aiAnalysis?: {
    riskLevel: string;
    possibleFeeling: string;
    mainRisk: string;
    suggestedLine: string;
    recommendedTiming: string;
    shouldSend: boolean;
  }
) {
  const data = await readStore();

  const riskLevel = aiAnalysis?.riskLevel
    ?? (input.userLine.includes("必须") || input.userLine.includes("为什么不回")
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

  const suggestedLine = aiAnalysis?.suggestedLine
    ?? (riskLevel === "high"
      ? "刚才我可能有点急了，你不用马上回复。等你方便的时候再说就好。"
      : "你之前提到的那件事我也挺感兴趣。要是哪天你也想去，我们可以一起。");

  const run: DevPracticeRun = {
    id: crypto.randomUUID(),
    crushId: input.crushId,
    practiceType: "quick_line",
    scenarioType: input.scenarioType,
    sendContext: input.sendContext,
    userLine: input.userLine,
    riskLevel,
    simulatedReply,
    suggestedLine,
    coachAnalysisJson: {
      possibleFeeling: aiAnalysis?.possibleFeeling ?? (riskLevel === "low" ? "压力较小，像自然延续话题。" : "对方可能感到推进略快或被施压。"),
      mainRisk: aiAnalysis?.mainRisk ?? (riskLevel === "low" ? "风险较低。" : "铺垫不足，表达压力偏高。"),
      advice: aiAnalysis?.recommendedTiming ?? (riskLevel === "high" ? "建议先降频，避免追问。" : "降低邀约压力，保留对方选择空间。"),
      shouldSend: aiAnalysis?.shouldSend ?? (riskLevel !== "high"),
    },
    createdAt: now(),
  };
  data.practiceRuns.push(run);
  const metrics = data.growthMetrics.find((item) => item.crushId === input.crushId);
  if (metrics) {
    metrics.communicationConfidence = Math.min(100, metrics.communicationConfidence + 3);
    metrics.updatedAt = run.createdAt;
  }
  await writeStore(data);
  return run;
}

export async function getDevPracticeRunById(practiceRunId: string) {
  const data = await readStore();
  return data.practiceRuns.find((run) => run.id === practiceRunId) ?? null;
}

export async function getDevPracticeChaptersForCrush(crushId: string) {
  const data = await readStore();
  return data.practiceChapters.filter((chapter) => chapter.crushId === crushId);
}

export async function getDevRealityEvents(crushId: string) {
  const data = await readStore();
  return data.realityEvents.filter((event) => event.crushId === crushId);
}

export async function getDevRealitySignals(crushId: string) {
  const data = await readStore();
  return data.realitySignals.filter((signal) => signal.crushId === crushId);
}

export async function getDevRealityInferences(crushId: string) {
  const data = await readStore();
  return data.realityInferences.filter((inference) => inference.crushId === crushId);
}

export async function createDevRealityEvent(input: {
  crushId: string;
  sourceType?: string;
  sourceMessageId?: string | null;
  eventText: string;
  eventType?: string;
  occurredAtText?: string | null;
  extractionJson?: Record<string, unknown>;
}) {
  const data = await readStore();
  const existing = input.sourceMessageId
    ? data.realityEvents.find((event) => event.sourceMessageId === input.sourceMessageId && event.status === "confirmed")
    : null;

  if (existing) {
    return existing;
  }

  const createdAt = now();
  const event: DevRealityEvent = {
    id: crypto.randomUUID(),
    crushId: input.crushId,
    sourceType: input.sourceType ?? "chat_message",
    sourceMessageId: input.sourceMessageId ?? null,
    eventType: input.eventType ?? "chat_observation",
    eventText: input.eventText,
    occurredAtText: input.occurredAtText ?? null,
    extractionJson: input.extractionJson ?? {},
    status: "confirmed",
    createdAt,
    updatedAt: createdAt,
  };

  data.realityEvents.push(event);
  await writeStore(data);
  return event;
}

export async function createDevRealitySignals(
  rows: Array<{
    crushId: string;
    eventId?: string | null;
    signalType?: string;
    label: string;
    description?: string | null;
    polarity?: string;
    confidence?: number;
    evidenceJson?: Record<string, unknown>;
    status?: "active" | "dismissed";
  }>,
) {
  if (!rows.length) {
    return [];
  }

  const data = await readStore();
  const createdAt = now();
  const signals: DevRealitySignal[] = rows.map((row) => ({
    id: crypto.randomUUID(),
    crushId: row.crushId,
    eventId: row.eventId ?? null,
    signalType: row.signalType ?? "interaction",
    label: row.label,
    description: row.description ?? null,
    polarity: row.polarity ?? "neutral",
    confidence: row.confidence ?? 0.5,
    evidenceJson: row.evidenceJson ?? {},
    status: row.status ?? "active",
    createdAt,
    updatedAt: createdAt,
  }));
  data.realitySignals.push(...signals);
  await writeStore(data);
  return signals;
}

export async function createDevRealityInferences(
  rows: Array<{
    crushId: string;
    eventId?: string | null;
    inferenceType?: string;
    label: string;
    description?: string | null;
    confidence?: number;
    evidenceJson?: Record<string, unknown>;
    status?: "pending" | "confirmed" | "dismissed";
  }>,
) {
  if (!rows.length) {
    return [];
  }

  const data = await readStore();
  const createdAt = now();
  const inferences: DevRealityInference[] = rows.map((row) => ({
    id: crypto.randomUUID(),
    crushId: row.crushId,
    eventId: row.eventId ?? null,
    inferenceType: row.inferenceType ?? "relationship_state",
    label: row.label,
    description: row.description ?? null,
    confidence: row.confidence ?? 0.5,
    evidenceJson: row.evidenceJson ?? {},
    status: row.status ?? "pending",
    createdAt,
    updatedAt: createdAt,
  }));
  data.realityInferences.push(...inferences);
  await writeStore(data);
  return inferences;
}

export async function startDevSimulation(input: {
  crushId: string;
  scenarioType: string;
  goal: string;
  background: string;
  triggerSource?: "user_click" | "ta_invite";
  sourceMessageId?: string | null;
  realityContextJson?: Record<string, unknown>;
}) {
  const data = await readStore();
  const createdAt = now();
  const session: DevChatSession = {
    id: crypto.randomUUID(),
    crushId: input.crushId,
    sessionType: "practice",
    title: input.goal,
    scenarioType: input.scenarioType,
    status: "active",
    createdAt,
    updatedAt: createdAt,
  };
  const chapter: DevPracticeChapter = {
    id: crypto.randomUUID(),
    crushId: input.crushId,
    companionSessionId: null,
    practiceSessionId: session.id,
    practiceRunId: null,
    title: input.goal,
    scenarioType: input.scenarioType,
    triggerSource: input.triggerSource ?? "user_click",
    status: "active",
    startMessageId: input.sourceMessageId ?? null,
    endMessageId: null,
    realityContextJson: input.realityContextJson ?? { background: input.background },
    recapJson: {},
    suggestedLine: null,
    createdAt,
    updatedAt: createdAt,
    finishedAt: null,
  };
  data.chatSessions.push(session);
  data.practiceChapters.push(chapter);
  data.messages.push({
    id: crypto.randomUUID(),
    sessionId: session.id,
    role: "system",
    content: `背景：${input.background}`,
    createdAt,
  });
  await writeStore(data);
  return { ...session, chapter };
}

export async function addDevSimulationTurn(
  sessionId: string,
  message: string,
  turn?: {
    crushReply: string;
    coachTip: {
      riskLevel: string;
      advice: string;
      nextMove: string;
    };
  },
) {
  const data = await readStore();
  const session = data.chatSessions.find((item) => item.id === sessionId);
  if (!session) {
    return null;
  }
  const createdAt = now();
  const userMessage: DevMessage = {
    id: crypto.randomUUID(),
    sessionId,
    role: "user",
    content: message,
    createdAt,
  };
  const crushReply = turn?.crushReply ?? (message.includes("抱歉")
    ? "没事啦，只是当时有点突然。你这样说我会比较好理解。"
    : "我听到了，不过我可能需要一点时间想想。");
  const coachTip = turn?.coachTip ?? {
    riskLevel: message.includes("必须") ? "high" : "low",
    advice: message.includes("抱歉") ? "表达清楚且不过度解释，可以停在这里给对方空间。" : "继续保持轻量，不要急着要求对方表态。",
    nextMove: "观察对方是否主动延续话题。",
  };
  const crushMessage: DevMessage = {
    id: crypto.randomUUID(),
    sessionId,
    role: "crush",
    content: crushReply,
    metadataJson: { coachTip },
    createdAt,
  };
  data.messages.push(userMessage, crushMessage);
  session.updatedAt = createdAt;
  await writeStore(data);
  return { crushReply, coachTip, userMessage, crushMessage };
}

export async function removeDevSimulationLastTurn(sessionId: string) {
  const data = await readStore();
  const session = data.chatSessions.find((item) => item.id === sessionId);
  if (!session || session.status !== "active") {
    return null;
  }

  const sessionMessages = data.messages
    .filter((message) => message.sessionId === sessionId)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  const lastUserMessage = [...sessionMessages].reverse().find((message) => message.role === "user");
  if (!lastUserMessage) {
    return null;
  }

  const removedIds = new Set(
    sessionMessages
      .filter(
        (message) =>
          message.createdAt === lastUserMessage.createdAt &&
          ["user", "crush", "coach"].includes(message.role),
      )
      .map((message) => message.id),
  );
  data.messages = data.messages.filter((message) => !removedIds.has(message.id));
  session.updatedAt = now();
  await writeStore(data);

  return {
    removedMessageIds: [...removedIds],
    restoredText: lastUserMessage.content,
  };
}

export async function finishDevSimulation(
  sessionId: string,
  payload?: {
    riskLevel: string;
    simulatedReply?: string | null;
    suggestedLine?: string | null;
    coachAnalysisJson: Record<string, unknown>;
  },
) {
  const data = await readStore();
  const session = data.chatSessions.find((item) => item.id === sessionId);
  if (!session) {
    return null;
  }
  session.status = "completed";
  session.updatedAt = now();
  const run: DevPracticeRun = {
    id: crypto.randomUUID(),
    crushId: session.crushId,
    sessionId,
    practiceType: "full_simulation",
    scenarioType: session.scenarioType ?? "conversation",
    riskLevel: payload?.riskLevel ?? "low",
    simulatedReply: payload?.simulatedReply ?? "整体反馈较温和，但仍建议给对方空间。",
    suggestedLine: payload?.suggestedLine ?? "刚刚那件事我想清楚了，不急着让你马上回应，只是想把我的意思说清楚。",
    coachAnalysisJson: payload?.coachAnalysisJson ?? {
      summary: "你完成了一轮克制表达，没有把压力推给对方。",
      riskPoints: ["后续不要连续追问结果。"],
      recommendedNextAction: "等待对方自然回应，至少间隔半天。",
    },
    createdAt: session.updatedAt,
  };
  data.practiceRuns.push(run);
  const chapter = data.practiceChapters.find((item) => item.practiceSessionId === sessionId);
  if (chapter) {
    chapter.practiceRunId = run.id;
    chapter.status = "completed";
    chapter.recapJson = run.coachAnalysisJson;
    chapter.suggestedLine = run.suggestedLine ?? null;
    chapter.updatedAt = session.updatedAt;
    chapter.finishedAt = session.updatedAt;

    // M5.2: Create memory for completed practice chapter in dev mode
    const summary = typeof run.coachAnalysisJson === "object" && run.coachAnalysisJson
      ? (run.coachAnalysisJson as Record<string, unknown>).summary as string | undefined
      : undefined;

    // M6.2: Generate mock scene URL for dev mode
    const mockSceneUrl = `/api/mock-character?theme=sunny_campus&crush=${session.crushId}&asset=scene&t=${Date.now()}`;

    const memory: DevMemory = {
      id: crypto.randomUUID(),
      crushId: session.crushId,
      sourceType: "practice_chapter",
      sourceId: chapter.id,
      title: `完成演练：${chapter.title ?? "一次演练"}`,
      excerpt: summary ?? "完成了一次演练，为现实行动做好准备。",
      emotionTag: "encouraging",
      importanceLevel: 2,
      imageUrl: mockSceneUrl,
      createdAt: session.updatedAt,
    };
    data.memories.push(memory);
    const metrics = data.growthMetrics.find((item) => item.crushId === session.crushId);
    if (metrics) {
      metrics.memoryFragments += 1;
      metrics.virtualIntimacy = Math.min(999, metrics.virtualIntimacy + 5);
      metrics.updatedAt = session.updatedAt;
    }
  }
  await writeStore(data);
  return run;
}

export async function createDevAction(input: {
  crushId: string;
  practiceRunId?: string | null;
  title: string;
  suggestedMessage?: string | null;
}) {
  const data = await readStore();
  const createdAt = now();
  const action: DevRealAction = {
    id: crypto.randomUUID(),
    crushId: input.crushId,
    practiceRunId: input.practiceRunId ?? null,
    title: input.title,
    suggestedMessage: input.suggestedMessage ?? null,
    status: "pending",
    feedbackText: null,
    executedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
  data.realActions.push(action);
  await writeStore(data);
  return action;
}

export async function getDevActions(crushId: string) {
  const data = await readStore();
  return data.realActions.filter((action) => action.crushId === crushId);
}

export async function getDevActionById(actionId: string) {
  const data = await readStore();
  return data.realActions.find((action) => action.id === actionId) ?? null;
}

export async function updateDevAction(actionId: string, input: { status: string; feedbackText?: string | null }) {
  const data = await readStore();
  const action = data.realActions.find((item) => item.id === actionId);
  if (!action) {
    return null;
  }
  const updatedAt = now();
  action.status = input.status;
  action.feedbackText = input.feedbackText ?? action.feedbackText ?? null;
  action.updatedAt = updatedAt;
  if (["sent", "positive_response", "neutral_response", "cold_response"].includes(input.status)) {
    action.executedAt = action.executedAt ?? updatedAt;
  }
  const suggestion: DevProfileUpdateSuggestion = {
    id: crypto.randomUUID(),
    crushId: action.crushId,
    sourceType: "action_feedback",
    sourceId: action.id,
    suggestionJson: {
      facts: input.feedbackText ? [{ label: "现实反馈", value: input.feedbackText }] : [],
      inferredTraits: [{ label: "互动温度", value: input.status === "positive_response" ? "中性偏暖" : "需要继续观察" }],
    },
    confidence: input.status === "positive_response" ? 0.72 : 0.55,
    status: "pending",
    createdAt: updatedAt,
  };
  data.profileUpdateSuggestions.push(suggestion);
  const metrics = data.growthMetrics.find((item) => item.crushId === action.crushId);
  if (metrics && action.executedAt) {
    metrics.realActionCount += 1;
    metrics.communicationConfidence = Math.min(100, metrics.communicationConfidence + 5);
    metrics.updatedAt = updatedAt;

    // M5.2: Create memory for executed action in dev mode
    let emotionTag = "warm";
    let importanceLevel = 2;
    if (input.status === "positive_response") {
      emotionTag = "milestone";
      importanceLevel = 3;
    } else if (input.status === "cold_response") {
      emotionTag = "gentle";
      importanceLevel = 1;
    }

    const actionTitle = action.title ?? "一次现实行动";
    let excerpt = `执行了行动「${actionTitle}」`;
    if (input.feedbackText?.trim()) {
      excerpt += `。反馈：${input.feedbackText.trim().slice(0, 100)}`;
    }

    const memory: DevMemory = {
      id: crypto.randomUUID(),
      crushId: action.crushId,
      sourceType: "action_completed",
      sourceId: action.id,
      title: `完成行动：${actionTitle}`,
      excerpt,
      emotionTag,
      importanceLevel,
      createdAt: updatedAt,
    };
    data.memories.push(memory);
    if (metrics) {
      metrics.memoryFragments += 1;
      metrics.virtualIntimacy = Math.min(999, metrics.virtualIntimacy + 5);
    }
  }
  await writeStore(data);
  return { action, suggestion };
}

export async function getDevSuggestions(crushId: string) {
  const data = await readStore();
  return data.profileUpdateSuggestions.filter((suggestion) => suggestion.crushId === crushId);
}

export async function getDevSuggestionById(suggestionId: string) {
  const data = await readStore();
  return data.profileUpdateSuggestions.find((suggestion) => suggestion.id === suggestionId) ?? null;
}

export async function resolveDevSuggestion(id: string, decision: "accepted" | "rejected") {
  const data = await readStore();
  const suggestion = data.profileUpdateSuggestions.find((item) => item.id === id);
  if (!suggestion) {
    return null;
  }
  suggestion.status = decision;
  suggestion.resolvedAt = now();
  if (decision === "accepted") {
    const payload = suggestion.suggestionJson as {
      facts?: { label: string; value?: string }[];
      inferredTraits?: { label: string; value?: string }[];
    };
    for (const fact of payload.facts ?? []) {
      data.crushTraits.push({
        id: crypto.randomUUID(),
        crushId: suggestion.crushId,
        traitType: "event",
        label: fact.label,
        description: fact.value ?? null,
        source: "ai",
        confidence: suggestion.confidence,
        confirmed: true,
        createdAt: suggestion.resolvedAt,
      });
    }
    const metrics = data.growthMetrics.find((item) => item.crushId === suggestion.crushId);
    if (metrics) {
      metrics.relationshipUnderstanding = Math.min(100, metrics.relationshipUnderstanding + 5);
      metrics.updatedAt = suggestion.resolvedAt;
    }
  }
  await writeStore(data);
  return suggestion;
}

export async function destroyDevCrush(userId: string, crushId: string) {
  const data = await readStore();
  const profile = data.crushProfiles.find((item) => item.id === crushId && item.userId === userId);
  if (!profile) {
    return null;
  }
  const destroyedAt = now();
  data.crushProfiles = data.crushProfiles.filter((item) => item.id !== crushId);
  data.crushTraits = data.crushTraits.filter((item) => item.crushId !== crushId);
  data.growthMetrics = data.growthMetrics.filter((item) => item.crushId !== crushId);
  data.onboardingMaterials = data.onboardingMaterials.filter((item) => item.crushId !== crushId);
  data.aiProfileDrafts = data.aiProfileDrafts.filter((item) => item.crushId !== crushId);
  data.visualAssets = data.visualAssets.filter((item) => item.crushId !== crushId);
  data.voiceProfiles = data.voiceProfiles.filter((item) => item.crushId !== crushId);
  const sessions = data.chatSessions.filter((item) => item.crushId === crushId).map((item) => item.id);
  data.chatSessions = data.chatSessions.filter((item) => item.crushId !== crushId);
  data.messages = data.messages.filter((item) => !sessions.includes(item.sessionId));
  data.practiceRuns = data.practiceRuns.filter((item) => item.crushId !== crushId);
  data.practiceChapters = data.practiceChapters.filter((item) => item.crushId !== crushId);
  data.realityEvents = data.realityEvents.filter((item) => item.crushId !== crushId);
  data.realitySignals = data.realitySignals.filter((item) => item.crushId !== crushId);
  data.realityInferences = data.realityInferences.filter((item) => item.crushId !== crushId);
  data.realActions = data.realActions.filter((item) => item.crushId !== crushId);
  data.profileUpdateSuggestions = data.profileUpdateSuggestions.filter((item) => item.crushId !== crushId);
  data.memories = data.memories.filter((item) => item.crushId !== crushId);
  data.auditEvents.push({
    id: crypto.randomUUID(),
    userId,
    eventType: "crush_destroyed",
    createdAt: destroyedAt,
  });
  await writeStore(data);
  return { destroyedAt };
}

// ============ Auth Functions ============

const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 30 * 1000; // 30 days

export function isDevSessionValid(session: DevSession): boolean {
  const now = Date.now();
  const expiresAt = new Date(session.expiresAt).getTime();
  return expiresAt > now && !session.revokedAt;
}

export function getDevSessionById(sessionId: string): DevSession | null {
  const data = readStoreSync();
  return data.authSessions.find((s) => s.id === sessionId) ?? null;
}

function readStoreSync(): DevStoreData {
  try {
    const raw = readFileSync(storePath, "utf8");
    return { ...emptyStore(), ...(JSON.parse(raw) as Partial<DevStoreData>) };
  } catch {
    return emptyStore();
  }
}

export async function createDevSession(userId: string): Promise<string> {
  const data = await readStore();
  const sessionId = crypto.randomUUID();
  const nowMs = Date.now();
  const expiresAt = new Date(nowMs + SESSION_MAX_AGE_MS).toISOString();
  const now = new Date(nowMs).toISOString();

  const session: DevSession = {
    id: sessionId,
    userId,
    expiresAt,
    revokedAt: null,
    createdAt: now,
    lastSeenAt: now,
  };

  data.authSessions.push(session);
  await writeStore(data);
  return sessionId;
}

export async function revokeDevSession(sessionId: string): Promise<void> {
  const data = await readStore();
  const session = data.authSessions.find((s) => s.id === sessionId);
  if (session) {
    session.revokedAt = new Date().toISOString();
    await writeStore(data);
  }
}

export async function registerDevUser(
  email: string,
  passwordHash: string,
  currentUserId?: string | null
): Promise<{
  success: boolean;
  userId?: string;
  sessionId?: string;
  error?: string;
}> {
  const data = await readStore();

  // Check if email already exists
  const existingUser = data.registeredUsers.find((u) => u.email === email);
  if (existingUser) {
    return { success: false, error: "Email already registered" };
  }

  // Determine which user to upgrade
  let targetUserId = currentUserId;

  if (!targetUserId) {
    // No current user, create new user
    targetUserId = crypto.randomUUID();
    // Create the user record
    data.users.push({
      id: targetUserId,
      email: null,
      ageConfirmedAt: null,
      createdAt: now(),
      updatedAt: now(),
    });
  }

  // Add to registered users (store plain password for dev simplicity)
  data.registeredUsers.push({
    id: targetUserId,
    email,
    passwordHash, // In dev mode, this is stored as plain text for easy testing
  });

  // Upgrade the user with email
  const user = data.users.find((u) => u.id === targetUserId);
  if (user) {
    user.email = email;
    user.updatedAt = now();
  }

  // Create session inline with the same data to ensure atomicity
  const sessionId = crypto.randomUUID();
  const nowMs = Date.now();
  const expiresAt = new Date(nowMs + SESSION_MAX_AGE_MS).toISOString();
  const nowISO = new Date(nowMs).toISOString();
  data.authSessions.push({
    id: sessionId,
    userId: targetUserId,
    expiresAt,
    revokedAt: null,
    createdAt: nowISO,
    lastSeenAt: nowISO,
  });

  // Write all changes atomically
  await writeStore(data);

  return { success: true, userId: targetUserId, sessionId };
}

export async function loginDevUser(
  email: string,
  password: string
): Promise<{
  success: boolean;
  sessionId?: string;
  error?: string;
}> {
  const data = await readStore();

  const registeredUser = data.registeredUsers.find((u) => u.email === email);
  if (!registeredUser) {
    return { success: false, error: "Invalid email or password" };
  }

  // Verify password - in dev mode it may be plain text or scrypt hash
  let isValid = false;
  const storedHash = registeredUser.passwordHash;

  if (storedHash.startsWith("scrypt:")) {
    // Password was hashed with scrypt, verify using same logic as auth.ts
    const [scheme, salt, key] = storedHash.split(":");
    if (scheme === "scrypt" && salt && key) {
      const { scrypt, timingSafeEqual } = await import("node:crypto");
      const { promisify } = await import("node:util");
      const scryptAsync = promisify(scrypt);
      const storedKey = Buffer.from(key, "hex");
      const derivedKey = (await scryptAsync(password, salt, storedKey.length)) as Buffer;
      isValid = storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
    }
  } else {
    // Plain text password (legacy/dev simplicity)
    isValid = storedHash === password;
  }

  if (!isValid) {
    return { success: false, error: "Invalid email or password" };
  }

  // Create session inline to ensure atomicity
  const sessionId = crypto.randomUUID();
  const nowMs = Date.now();
  const expiresAt = new Date(nowMs + SESSION_MAX_AGE_MS).toISOString();
  const nowISO = new Date(nowMs).toISOString();
  data.authSessions.push({
    id: sessionId,
    userId: registeredUser.id,
    expiresAt,
    revokedAt: null,
    createdAt: nowISO,
    lastSeenAt: nowISO,
  });

  // Write all changes atomically
  await writeStore(data);

  return { success: true, sessionId };
}

export function getDevUserEmail(sessionId: string): string | null {
  const data = readStoreSync();
  const session = data.authSessions.find((s) => s.id === sessionId);
  if (!session || !isDevSessionValid(session)) {
    return null;
  }

  const registeredUser = data.registeredUsers.find((u) => u.id === session.userId);
  if (!registeredUser) {
    return null;
  }

  return registeredUser?.email ?? null;
}
