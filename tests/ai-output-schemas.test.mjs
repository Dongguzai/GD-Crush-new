import assert from "node:assert/strict";
import test from "node:test";
import {
  coachAnalysisSchema,
  profileAnalysisSchema,
  quickLineAnalysisSchema,
  realityFeedbackSchema,
  visualTagsSchema,
} from "../lib/ai-output-schemas.ts";

test("profile analysis accepts the canonical camelCase payload", () => {
  const result = profileAnalysisSchema.safeParse({
    profile: {
      name: "小林",
      gender: null,
      personalityTraits: ["慢热"],
      likes: ["咖啡"],
      dislikes: [],
      communicationStyle: "回复简短但稳定",
      currentMood: "平静",
      relationshipStage: "普通朋友",
    },
    textAnalysis: {
      emotionalTone: "轻松",
      powerDynamic: "基本平衡",
      underlyingIntent: "保持自然互动",
      coachAnalysis: {
        userRole: "主动方",
        strengths: "表达清楚",
        weaknesses: "偶尔推进过快",
        suggestedReply: "可以再轻一点",
        replayStrategy: "保留对方选择空间",
      },
    },
    realityFeedback: {
      progress: "有稳定互动",
      obstacles: "还缺少更深入话题",
      nextStepSuggestion: "先延续共同兴趣",
    },
  });

  assert.equal(result.success, true);
});

test("profile analysis rejects missing nested fields", () => {
  const result = profileAnalysisSchema.safeParse({
    profile: {
      name: null,
      gender: null,
      personalityTraits: [],
      likes: [],
      dislikes: [],
      communicationStyle: "",
      currentMood: "",
      relationshipStage: "",
    },
    textAnalysis: {
      emotionalTone: "",
      powerDynamic: "",
      underlyingIntent: "",
      coachAnalysis: {
        userRole: "",
        strengths: "",
        weaknesses: "",
        suggestedReply: "",
      },
    },
    realityFeedback: {
      progress: "",
      obstacles: "",
      nextStepSuggestion: "",
    },
  });

  assert.equal(result.success, false);
});

test("quick line rejects unsupported risk levels", () => {
  const result = quickLineAnalysisSchema.safeParse({
    riskLevel: "urgent",
    possibleFeeling: "压力较大",
    mainRisk: "推进过快",
    suggestedLine: "改天有空再聊也行",
    recommendedTiming: "今晚",
    shouldSend: false,
  });

  assert.equal(result.success, false);
});

test("coach analysis rejects wrong field types", () => {
  const result = coachAnalysisSchema.safeParse({
    analysis: ["too direct"],
    suggestedReply: "可以慢一点说",
    emotionalSupport: "先照顾好自己的节奏",
  });

  assert.equal(result.success, false);
});

test("reality feedback rejects out-of-range confidence", () => {
  const result = realityFeedbackSchema.safeParse({
    progress: "有来有回",
    obstacles: "回复间隔较长",
    relationshipSignals: [
      {
        type: "positive",
        description: "主动延续话题",
        confidence: 1.4,
      },
    ],
    nextStepSuggestion: "继续观察",
  });

  assert.equal(result.success, false);
});

test("visual tags reject missing required booleans", () => {
  const result = visualTagsSchema.safeParse({
    hairStyle: "短发",
    hairColor: "深棕",
    outfitMood: "清爽",
    overallVibe: "温柔",
    expressionMood: "平静",
    ageImpressionRange: "青年",
    unsafeOrSensitiveElements: [],
  });

  assert.equal(result.success, false);
});

test("visual tags accept a strict payload", () => {
  const result = visualTagsSchema.safeParse({
    hairStyle: "短发",
    hairColor: "深棕",
    outfitMood: "清爽",
    overallVibe: "温柔",
    expressionMood: "平静",
    ageImpressionRange: "青年",
    unsafeOrSensitiveElements: [],
    hasPerson: true,
    notes: "无明显风险",
  });

  assert.equal(result.success, true);
});
