export const RELATIONSHIP_STAGES = [
  "陌生/未接触",
  "点头之交",
  "普通朋友",
  "熟悉朋友",
  "暧昧试探",
  "明确好感",
  "关系确认",
  "冷却/疏远",
  "结束/放下",
] as const;

export const INTERACTION_TEMPERATURES = ["cold", "neutral", "neutral_warm", "warm"] as const;

export const RISK_LEVELS = ["low", "medium", "high"] as const;

export const CRUSH_STATUSES = ["active", "archived", "destroyed"] as const;

export type RelationshipStage = (typeof RELATIONSHIP_STAGES)[number];
export type InteractionTemperature = (typeof INTERACTION_TEMPERATURES)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];
export type CrushStatus = (typeof CRUSH_STATUSES)[number];
