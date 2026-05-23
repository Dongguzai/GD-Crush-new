import { z } from "zod";

export const riskLevelSchema = z.enum(["low", "medium", "high"]);

export const profileAnalysisSchema = z
  .object({
    profile: z
      .object({
        name: z.string().nullable(),
        gender: z.string().nullable(),
        personalityTraits: z.array(z.string()),
        likes: z.array(z.string()),
        dislikes: z.array(z.string()),
        communicationStyle: z.string(),
        currentMood: z.string(),
        relationshipStage: z.string(),
      })
      .strict(),
    textAnalysis: z
      .object({
        emotionalTone: z.string(),
        powerDynamic: z.string(),
        underlyingIntent: z.string(),
        coachAnalysis: z
          .object({
            userRole: z.string(),
            strengths: z.string(),
            weaknesses: z.string(),
            suggestedReply: z.string(),
            replayStrategy: z.string(),
          })
          .strict(),
      })
      .strict(),
    realityFeedback: z
      .object({
        progress: z.string(),
        obstacles: z.string(),
        nextStepSuggestion: z.string(),
      })
      .strict(),
  })
  .strict();

export const textAnalysisSchema = z
  .object({
    emotionalTone: z.string(),
    powerDynamic: z.string(),
    underlyingIntent: z.string(),
    coachAnalysis: z
      .object({
        strengths: z.string(),
        weaknesses: z.string(),
        suggestedReply: z.string(),
      })
      .strict(),
  })
  .strict();

export const quickLineAnalysisSchema = z
  .object({
    riskLevel: riskLevelSchema,
    possibleFeeling: z.string(),
    mainRisk: z.string(),
    suggestedLine: z.string(),
    recommendedTiming: z.string(),
    shouldSend: z.boolean(),
  })
  .strict();

export const realityFeedbackSchema = z
  .object({
    progress: z.string(),
    obstacles: z.string(),
    relationshipSignals: z.array(
      z
        .object({
          type: z.enum(["positive", "neutral", "negative"]),
          description: z.string(),
          confidence: z.number().min(0).max(1),
        })
        .strict(),
    ),
    nextStepSuggestion: z.string(),
  })
  .strict();

export const coachAnalysisSchema = z
  .object({
    analysis: z.string(),
    suggestedReply: z.string(),
    emotionalSupport: z.string(),
  })
  .strict();

export const practiceCoachTipSchema = z
  .object({
    riskLevel: riskLevelSchema,
    advice: z.string(),
    nextMove: z.string(),
  })
  .strict();

export const practiceSimulationTurnSchema = z
  .object({
    crushReply: z.string().min(1),
    coachTip: practiceCoachTipSchema,
  })
  .strict();

export const practiceChapterRecapSchema = z
  .object({
    summary: z.string(),
    mainRisk: z.string(),
    saferAlternative: z.string(),
    riskPoints: z.array(z.string()),
    recommendedNextAction: z.string(),
    suggestedLine: z.string(),
    actionEligible: z.boolean(),
  })
  .strict();

export const visualTagsSchema = z
  .object({
    hairStyle: z.string(),
    hairColor: z.string(),
    outfitMood: z.string(),
    overallVibe: z.string(),
    expressionMood: z.string(),
    ageImpressionRange: z.string(),
    unsafeOrSensitiveElements: z.array(z.string()),
    hasPerson: z.boolean(),
    notes: z.string().optional(),
  })
  .strict();

export type ProfileAnalysisResult = z.infer<typeof profileAnalysisSchema>;
export type TextAnalysisResult = z.infer<typeof textAnalysisSchema>;
export type QuickLineAnalysisResult = z.infer<typeof quickLineAnalysisSchema>;
export type RealityFeedbackResult = z.infer<typeof realityFeedbackSchema>;
export type CoachAnalysisResult = z.infer<typeof coachAnalysisSchema>;
export type PracticeCoachTipResult = z.infer<typeof practiceCoachTipSchema>;
export type PracticeSimulationTurnResult = z.infer<typeof practiceSimulationTurnSchema>;
export type PracticeChapterRecapResult = z.infer<typeof practiceChapterRecapSchema>;
export type VisualTagsResult = z.infer<typeof visualTagsSchema>;
