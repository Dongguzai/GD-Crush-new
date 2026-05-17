export type VisualTheme = "sunny_campus" | "city_healing" | "dream_otome";
export type CharacterAssetKind = "avatar" | "portrait" | "neutral" | "happy" | "shy";

const THEME_LABELS: Record<VisualTheme, string> = {
  sunny_campus: "晴日校园，阳光、课后、便利店、青春感",
  city_healing: "都市治愈，咖啡馆、雨夜、下班后、安静陪伴",
  dream_otome: "梦幻乙女，花园、星光、节日、强恋爱氛围",
};

const ASSET_REQUIREMENTS: Record<CharacterAssetKind, string> = {
  avatar: "构图：头像，1:1，脸部清晰，适合 App 头像。",
  portrait: "构图：半身立绘，3:4，身体到腰部，适合角色卡展示。",
  neutral: "构图：半身立绘，3:4，平静表情。",
  happy: "构图：半身立绘，3:4，自然开心表情。",
  shy: "构图：半身立绘，3:4，轻微害羞表情。",
};

function visualTagsToText(visualTags: Record<string, unknown>) {
  return Object.entries(visualTags)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join("、") : String(value)}`)
    .join("；");
}

export function buildCharacterPrompt(input: {
  assetKind: CharacterAssetKind;
  theme: VisualTheme;
  visualTags: Record<string, unknown>;
  personalitySummary?: string | null;
}) {
  const tags = visualTagsToText(input.visualTags);
  return [
    "生成一个明显虚构的二次元 / 乙女游戏风格虚拟角色。",
    `主题：${THEME_LABELS[input.theme]}`,
    tags ? `视觉标签：${tags}` : null,
    input.personalitySummary ? `性格摘要：${input.personalitySummary}` : null,
    ASSET_REQUIREMENTS[input.assetKind],
    "要求：高质量动漫插画，线条干净，色彩精致，移动端友好，不要写实，不要复刻真实人物身份。",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildScenePrompt(input: {
  theme: VisualTheme;
  sceneDescription: string;
  visualTags?: Record<string, unknown>;
}) {
  const tags = input.visualTags ? visualTagsToText(input.visualTags) : "";
  return [
    "生成一个二次元 / 乙女游戏风格的场景背景图。",
    `主题：${THEME_LABELS[input.theme]}`,
    `场景描述：${input.sceneDescription}`,
    tags ? `角色视觉氛围参考：${tags}` : null,
    "要求：16:9，适合作为视觉小说背景，构图留白适合前景角色叠放，高质量，细节丰富。",
  ]
    .filter(Boolean)
    .join("\n");
}

