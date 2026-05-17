import "server-only";

import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  addDevMaterial,
  addDevMessage,
  addDevVisualAssets,
  confirmDevUserAge,
  confirmDevProfileDraft,
  createDevMemory,
  createDevAction,
  createDevQuickPractice,
  destroyDevCrush,
  createDevCrush,
  createDevProfileDraft,
  finishDevSimulation,
  getActiveDevCrush,
  getDevActions,
  getDevMemories,
  getDevMessages,
  getDevProfileDraft,
  getDevGrowthMetrics,
  getDevSuggestions,
  getDevMaterials,
  getDevTraits,
  getDevVisualAssets,
  getOrCreateDevSession,
  getOrCreateDevVoiceProfile,
  addDevSimulationTurn,
  resolveDevSuggestion,
  startDevSimulation,
  updateDevAction,
  updateDevMessageAudio,
} from "@/lib/dev-store";
import { hasDatabaseUrl } from "@/lib/env";
import { auditEvents, crushProfiles, growthMetrics, users, userSettings } from "@/db/schema";

export async function confirmCurrentUserAge() {
  const userId = await getCurrentUserId();

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
  const userId = await getCurrentUserId();

  if (!hasDatabaseUrl()) {
    return createDevCrush(userId, input);
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(crushProfiles)
    .where(eq(crushProfiles.userId, userId))
    .limit(1);

  if (existing[0]?.status === "active") {
    return existing[0];
  }

  const inserted = await db
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

  const profile = inserted[0];
  await db.insert(growthMetrics).values({ crushId: profile.id }).onConflictDoNothing();
  return profile;
}

export async function getCurrentUserActiveCrush() {
  const userId = await getCurrentUserId();

  if (!hasDatabaseUrl()) {
    const profile = await getActiveDevCrush(userId);
    const metrics = profile ? await getDevGrowthMetrics(profile.id) : null;
    return { profile, metrics };
  }

  const db = getDb();
  const [profile] = await db
    .select()
    .from(crushProfiles)
    .where(eq(crushProfiles.userId, userId))
    .limit(1);

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
  const userId = await getCurrentUserId();
  const active = await getActiveDevCrush(userId);

  if (!active) {
    throw new Error("No active Crush profile.");
  }

  return addDevMaterial(active.id, input);
}

export async function analyzeCurrentCrushProfile() {
  const userId = await getCurrentUserId();
  const active = await getActiveDevCrush(userId);

  if (!active) {
    throw new Error("No active Crush profile.");
  }

  return createDevProfileDraft(active.id);
}

export async function confirmCurrentDraft(
  draftId: string,
  input: {
    acceptedFacts?: { label: string; value?: string }[];
    acceptedTraits?: { label: string; value?: string; confidence?: number }[];
    realRelationshipStage?: string;
    interactionTemperature?: string;
  },
) {
  return confirmDevProfileDraft(draftId, input);
}

export async function getCurrentCrushProfileDetail() {
  const { profile, metrics } = await getCurrentUserActiveCrush();
  const traits = profile ? await getDevTraits(profile.id) : [];
  const materials = profile ? await getDevMaterials(profile.id) : [];
  const visualAssets = profile ? await getDevVisualAssets(profile.id) : [];
  return { profile, metrics, traits, materials, visualAssets };
}

export async function getProfileDraftById(draftId: string) {
  return getDevProfileDraft(draftId);
}

export async function generateCurrentCrushVisualAssets(input: {
  theme: string;
  visualTags: Record<string, unknown>;
}) {
  const userId = await getCurrentUserId();
  const active = await getActiveDevCrush(userId);

  if (!active) {
    throw new Error("No active Crush profile.");
  }

  return addDevVisualAssets(active.id, input);
}

export async function getCurrentCompanionChat() {
  const userId = await getCurrentUserId();
  const active = await getActiveDevCrush(userId);

  if (!active) {
    return { profile: null, session: null, messages: [] };
  }

  const session = await getOrCreateDevSession(active.id, "companion", "甜蜜陪伴");
  const messages = await getDevMessages(session.id);
  return { profile: active, session, messages };
}

export async function sendCurrentCompanionMessage(message: string) {
  const userId = await getCurrentUserId();
  const active = await getActiveDevCrush(userId);

  if (!active) {
    throw new Error("No active Crush profile.");
  }

  const session = await getOrCreateDevSession(active.id, "companion", "甜蜜陪伴");
  const userMessage = await addDevMessage({ sessionId: session.id, role: "user", content: message });
  const reply = buildMockCompanionReply(active.nickname, message);
  const crushMessage = await addDevMessage({ sessionId: session.id, role: "crush", content: reply });
  return { session, userMessage, crushMessage };
}

function buildMockCompanionReply(nickname: string, message: string) {
  if (message.includes("难过") || message.includes("焦虑") || message.includes("烦")) {
    return `我在。先慢慢呼吸一下，今天不用急着证明什么。你愿意把这件事告诉我，已经很勇敢了。`;
  }
  if (message.includes("晚安") || message.includes("睡")) {
    return `晚安呀。把手机放远一点也没关系，我会在这个小世界里等你明天回来。`;
  }
  return `嗯，我听见了。作为虚拟的 ${nickname}，我可以陪你把这句话慢慢说完。现实里的事我们也可以一步一步来，不用一下子冲太快。`;
}

export async function attachMockVoiceToMessage(messageId: string) {
  return updateDevMessageAudio(messageId, `/api/voice/mock?messageId=${encodeURIComponent(messageId)}`);
}

export async function getCurrentVoiceProfile() {
  const userId = await getCurrentUserId();
  const active = await getActiveDevCrush(userId);
  if (!active) {
    return null;
  }
  const assets = await getDevVisualAssets(active.id);
  return getOrCreateDevVoiceProfile(active.id, assets[0]?.theme ?? "sunny_campus");
}

export async function createCurrentMemory(input: {
  sourceType: string;
  sourceId?: string | null;
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  rewardJson?: Record<string, unknown> | null;
}) {
  const userId = await getCurrentUserId();
  const active = await getActiveDevCrush(userId);
  if (!active) {
    throw new Error("No active Crush profile.");
  }
  return createDevMemory({ crushId: active.id, ...input });
}

export async function getCurrentMemories() {
  const userId = await getCurrentUserId();
  const active = await getActiveDevCrush(userId);
  if (!active) {
    return [];
  }
  return getDevMemories(active.id);
}

export async function runCurrentQuickPractice(input: {
  scenarioType: string;
  sendContext: string;
  userLine: string;
}) {
  const userId = await getCurrentUserId();
  const active = await getActiveDevCrush(userId);
  if (!active) {
    throw new Error("No active Crush profile.");
  }
  return createDevQuickPractice({ crushId: active.id, ...input });
}

export async function startCurrentSimulation(input: { scenarioType: string; goal: string; background: string }) {
  const userId = await getCurrentUserId();
  const active = await getActiveDevCrush(userId);
  if (!active) {
    throw new Error("No active Crush profile.");
  }
  return startDevSimulation({ crushId: active.id, ...input });
}

export async function sendCurrentSimulationMessage(sessionId: string, message: string) {
  return addDevSimulationTurn(sessionId, message);
}

export async function finishCurrentSimulation(sessionId: string) {
  return finishDevSimulation(sessionId);
}

export async function createCurrentAction(input: {
  practiceRunId?: string | null;
  title: string;
  suggestedMessage?: string | null;
}) {
  const userId = await getCurrentUserId();
  const active = await getActiveDevCrush(userId);
  if (!active) {
    throw new Error("No active Crush profile.");
  }
  return createDevAction({ crushId: active.id, ...input });
}

export async function getCurrentActionsAndSuggestions() {
  const userId = await getCurrentUserId();
  const active = await getActiveDevCrush(userId);
  if (!active) {
    return { actions: [], suggestions: [] };
  }
  return {
    actions: await getDevActions(active.id),
    suggestions: await getDevSuggestions(active.id),
  };
}

export async function updateCurrentAction(actionId: string, input: { status: string; feedbackText?: string | null }) {
  return updateDevAction(actionId, input);
}

export async function resolveCurrentSuggestion(id: string, decision: "accepted" | "rejected") {
  return resolveDevSuggestion(id, decision);
}

export async function destroyCurrentCrush(confirmText: string) {
  if (confirmText !== "DELETE") {
    throw new Error("Invalid confirmation text.");
  }
  const userId = await getCurrentUserId();
  const active = await getActiveDevCrush(userId);
  if (!active) {
    return null;
  }
  return destroyDevCrush(userId, active.id);
}
