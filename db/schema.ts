import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(),
  ageConfirmedAt: timestamp("age_confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  autoPlayCompanionVoice: boolean("auto_play_companion_voice").notNull().default(true),
  voiceSpeed: text("voice_speed").notNull().default("normal"),
  voiceEmotionLevel: text("voice_emotion_level").notNull().default("natural"),
  voiceAgeStyle: text("voice_age_style").notNull().default("young"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const crushProfiles = pgTable("crush_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
  relationshipOrigin: text("relationship_origin"),
  realRelationshipStage: text("real_relationship_stage").notNull().default("普通朋友"),
  interactionTemperature: text("interaction_temperature").notNull().default("neutral"),
  riskLevel: text("risk_level").notNull().default("low"),
  userGoal: text("user_goal"),
  userAnxiety: text("user_anxiety"),
  personalitySummary: text("personality_summary"),
  communicationStyle: text("communication_style"),
  aiConfidence: numeric("ai_confidence"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const crushTraits = pgTable("crush_traits", {
  id: uuid("id").primaryKey().defaultRandom(),
  crushId: uuid("crush_id")
    .notNull()
    .references(() => crushProfiles.id, { onDelete: "cascade" }),
  traitType: text("trait_type").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  source: text("source").notNull().default("user"),
  confidence: numeric("confidence"),
  confirmed: boolean("confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const growthMetrics = pgTable("growth_metrics", {
  crushId: uuid("crush_id")
    .primaryKey()
    .references(() => crushProfiles.id, { onDelete: "cascade" }),
  virtualIntimacy: integer("virtual_intimacy").notNull().default(0),
  communicationConfidence: integer("communication_confidence").notNull().default(35),
  relationshipUnderstanding: integer("relationship_understanding").notNull().default(20),
  emotionalStability: integer("emotional_stability").notNull().default(40),
  realActionCount: integer("real_action_count").notNull().default(0),
  memoryFragments: integer("memory_fragments").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const onboardingMaterials = pgTable("onboarding_materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  crushId: uuid("crush_id")
    .notNull()
    .references(() => crushProfiles.id, { onDelete: "cascade" }),
  materialType: text("material_type").notNull(),
  sanitizedText: text("sanitized_text"),
  storageUrl: text("storage_url"),
  retentionStatus: text("retention_status").notNull().default("retained_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const aiProfileDrafts = pgTable("ai_profile_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  crushId: uuid("crush_id")
    .notNull()
    .references(() => crushProfiles.id, { onDelete: "cascade" }),
  factsJson: jsonb("facts_json").notNull().default([]),
  inferredTraitsJson: jsonb("inferred_traits_json").notNull().default([]),
  boundariesJson: jsonb("boundaries_json").notNull().default([]),
  recommendedStage: text("recommended_stage").notNull().default("普通朋友"),
  interactionTemperature: text("interaction_temperature").notNull().default("neutral"),
  confidence: numeric("confidence").notNull().default("0.5"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
});

export const visualAssets = pgTable("visual_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  crushId: uuid("crush_id")
    .notNull()
    .references(() => crushProfiles.id, { onDelete: "cascade" }),
  assetType: text("asset_type").notNull(),
  expression: text("expression"),
  theme: text("theme").notNull(),
  visualTagsJson: jsonb("visual_tags_json").notNull().default({}),
  storageUrl: text("storage_url").notNull(),
  promptSnapshot: text("prompt_snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const voiceProfiles = pgTable("voice_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  crushId: uuid("crush_id")
    .notNull()
    .references(() => crushProfiles.id, { onDelete: "cascade" }),
  voiceStyle: text("voice_style").notNull().default("gentle"),
  speed: text("speed").notNull().default("normal"),
  emotionLevel: text("emotion_level").notNull().default("natural"),
  ageStyle: text("age_style").notNull().default("young"),
  providerVoiceId: text("provider_voice_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  crushId: uuid("crush_id")
    .notNull()
    .references(() => crushProfiles.id, { onDelete: "cascade" }),
  sessionType: text("session_type").notNull(),
  title: text("title"),
  scenarioType: text("scenario_type"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  audioUrl: text("audio_url"),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceRuns = pgTable("practice_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  crushId: uuid("crush_id")
    .notNull()
    .references(() => crushProfiles.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").references(() => chatSessions.id, { onDelete: "set null" }),
  practiceType: text("practice_type").notNull(),
  scenarioType: text("scenario_type").notNull(),
  sendContext: text("send_context"),
  userLine: text("user_line"),
  riskLevel: text("risk_level").notNull().default("low"),
  simulatedReply: text("simulated_reply"),
  coachAnalysisJson: jsonb("coach_analysis_json").notNull().default({}),
  suggestedLine: text("suggested_line"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceChapters = pgTable("practice_chapters", {
  id: uuid("id").primaryKey().defaultRandom(),
  crushId: uuid("crush_id")
    .notNull()
    .references(() => crushProfiles.id, { onDelete: "cascade" }),
  companionSessionId: uuid("companion_session_id").references(() => chatSessions.id, { onDelete: "set null" }),
  practiceSessionId: uuid("practice_session_id").references(() => chatSessions.id, { onDelete: "set null" }),
  practiceRunId: uuid("practice_run_id").references(() => practiceRuns.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  scenarioType: text("scenario_type").notNull().default("conversation"),
  triggerSource: text("trigger_source").notNull().default("user_click"),
  status: text("status").notNull().default("active"),
  startMessageId: uuid("start_message_id").references(() => messages.id, { onDelete: "set null" }),
  endMessageId: uuid("end_message_id").references(() => messages.id, { onDelete: "set null" }),
  realityContextJson: jsonb("reality_context_json").notNull().default({}),
  recapJson: jsonb("recap_json").notNull().default({}),
  suggestedLine: text("suggested_line"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const realityEvents = pgTable("reality_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  crushId: uuid("crush_id")
    .notNull()
    .references(() => crushProfiles.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull().default("chat_message"),
  sourceMessageId: uuid("source_message_id").references(() => messages.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull().default("chat_observation"),
  eventText: text("event_text").notNull(),
  occurredAtText: text("occurred_at_text"),
  extractionJson: jsonb("extraction_json").notNull().default({}),
  status: text("status").notNull().default("confirmed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const realActions = pgTable("real_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  crushId: uuid("crush_id")
    .notNull()
    .references(() => crushProfiles.id, { onDelete: "cascade" }),
  practiceRunId: uuid("practice_run_id").references(() => practiceRuns.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  suggestedMessage: text("suggested_message"),
  status: text("status").notNull().default("pending"),
  feedbackText: text("feedback_text"),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profileUpdateSuggestions = pgTable("profile_update_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  crushId: uuid("crush_id")
    .notNull()
    .references(() => crushProfiles.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(),
  sourceId: uuid("source_id"),
  suggestionJson: jsonb("suggestion_json").notNull().default({}),
  confidence: numeric("confidence").notNull().default("0.5"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const memories = pgTable("memories", {
  id: uuid("id").primaryKey().defaultRandom(),
  crushId: uuid("crush_id")
    .notNull()
    .references(() => crushProfiles.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(),
  sourceId: uuid("source_id"),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  imageUrl: text("image_url"),
  rewardJson: jsonb("reward_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
