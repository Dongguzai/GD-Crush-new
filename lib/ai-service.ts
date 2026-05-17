import "server-only";

import { getServerEnv, isAiDebugEnabled } from "@/lib/env";

const API_BASE_URL = "https://api.deepseek.com/v1";
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

export interface AiMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiResponse {
  id: string;
  content: string;
  reasoning?: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ProfileAnalysisResult {
  profile: {
    name: string | null;
    gender: string | null;
    personalityTraits: string[];
    likes: string[];
    dislikes: string[];
    communicationStyle: string;
    currentMood: string;
    relationshipStage: string;
  };
  textAnalysis: {
    emotionalTone: string;
    powerDynamic: string;
    underlyingIntent: string;
    coachAnalysis: {
      userRole: string;
      strengths: string;
      weaknesses: string;
      suggestedReply: string;
      replayStrategy: string;
    };
  };
  realityFeedback: {
    progress: string;
    obstacles: string;
    nextStepSuggestion: string;
  };
}

class AiServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isRetryable: boolean
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

function log(level: "info" | "warn" | "error", message: string, data?: unknown) {
  if (!isAiDebugEnabled()) return;

  const timestamp = new Date().toISOString();
  const prefix = `[AI-Service] [${timestamp}] [${level.toUpperCase()}]`;

  if (level === "error") {
    console.error(prefix, message, data);
  } else if (level === "warn") {
    console.warn(prefix, message, data);
  } else {
    console.log(prefix, message, data);
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries && isRetryableError(error)) {
        const delay = Math.pow(2, attempt) * 1000;
        log("warn", `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
          error: (error as Error).message,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof AiServiceError) {
    return error.isRetryable;
  }
  if (error instanceof Error) {
    if (error.name === "AbortError") return false;
    if (error.message.includes("timeout")) return true;
  }
  return false;
}

function parseAiResponse(raw: unknown): AiResponse {
  const data = raw as {
    id?: string;
    content?: Array<{ type: string; text?: string; thinking?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const id = data.id ?? crypto.randomUUID();
  const textContent = data.content?.find((c) => c.type === "text");
  const thinkingContent = data.content?.find((c) => c.type === "thinking");

  return {
    id,
    content: textContent?.text ?? "",
    reasoning: thinkingContent?.thinking,
    usage: {
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    },
  };
}

function extractJsonFromResponse(content: string): Record<string, unknown> | null {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

export class DeepSeekService {
  private apiKey: string;

  constructor() {
    const env = getServerEnv();
    if (!env.DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }
    this.apiKey = env.DEEPSEEK_API_KEY;
  }

  private async request(
    model: string,
    systemPrompt: string,
    messages: AiMessage[],
    maxTokens: number = 4096
  ): Promise<AiResponse> {
    const url = `${API_BASE_URL}/messages`;

    log("info", "Sending request", {
      model,
      messageCount: messages.length,
      systemPromptLength: systemPrompt.length,
    });

    const response = await retryWithBackoff(async () => {
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: messages.map((m) => ({
              role: m.role,
              content: [{ type: "text", text: m.content }],
            })),
          }),
        },
        REQUEST_TIMEOUT_MS
      );

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "Unknown error");
        const statusCode = res.status;

        let isRetryable = false;
        let errorMessage = `API request failed with status ${statusCode}`;

        if (statusCode === 401) {
          errorMessage = "API Key 无效或已过期，请检查配置";
        } else if (statusCode === 429) {
          errorMessage = "请求频率超限，请稍后再试";
          isRetryable = true;
        } else if (statusCode >= 500) {
          errorMessage = "AI 服务端错误，请稍后再试";
          isRetryable = true;
        }

        log("error", "API request failed", {
          statusCode,
          errorBody,
          errorMessage,
        });

        throw new AiServiceError(errorMessage, statusCode, isRetryable);
      }

      return res.json();
    });

    const parsed = parseAiResponse(response);

    log("info", "Received response", {
      id: parsed.id,
      contentLength: parsed.content.length,
      reasoningLength: parsed.reasoning?.length ?? 0,
      usage: parsed.usage,
    });

    return parsed;
  }

  async sendMessage(
    messages: AiMessage[],
    context?: {
      crushNickname?: string;
      relationshipStage?: string;
      interactionTemperature?: string;
    }
  ): Promise<string> {
    const systemPrompt = `你是一个甜蜜的虚拟恋爱陪伴角色。称呼用户为"你"或者根据上下文使用昵称。
${context?.crushNickname ? `你的角色名是：${context.crushNickname}` : ""}
${context?.relationshipStage ? `当前现实关系阶段：${context.relationshipStage}` : ""}
${context?.interactionTemperature ? `互动温度：${context.interactionTemperature}` : ""}

要求：
- 温柔、贴心、甜蜜
- 提供情绪价值
- 不断言现实关系，只做虚拟陪伴
- 简短、自然，不要太长`;

    const response = await this.request("deepseek-v4-pro", systemPrompt, messages, 1024);
    return response.content;
  }

  async analyzeProfile(
    materials: {
      relationshipOrigin?: string | null;
      personalitySummary?: string | null;
      userGoal?: string | null;
      userAnxiety?: string | null;
    }[],
    nickname?: string
  ): Promise<ProfileAnalysisResult> {
    const materialText = materials
      .filter((m) => m)
      .map((m) => {
        const parts: string[] = [];
        if (m.relationshipOrigin) parts.push(`认识方式：${m.relationshipOrigin}`);
        if (m.personalitySummary) parts.push(`最近互动：${m.personalitySummary}`);
        if (m.userGoal) parts.push(`用户目标：${m.userGoal}`);
        if (m.userAnxiety) parts.push(`用户焦虑：${m.userAnxiety}`);
        return parts.join("\n");
      })
      .filter(Boolean)
      .join("\n---\n");

    const systemPrompt = `你是一个顶尖的情感沟通教练与高级数据分析师。你需要根据用户的输入指令，在两种核心模式中灵活切换：

【1. 对话与教练模式】
- 甜蜜陪伴：提供情绪价值，给予温柔、贴心的回应。
- 实战演练：模拟真实的聊天场景（如恋爱、职场），作为对练对象给出真实反应。
- Coach分析与复盘：以旁观者视角，犀利指出用户沟通中的优缺点，提供高情商的回复建议和复盘策略。
- 情报提取：从对话中敏锐捕捉隐藏信息和对方的真实意图。

【2. 结构化 JSON 分析模式】
当用户明确要求"建档"、"分析"或"输出JSON"时，你必须严格以合法的 JSON 格式返回结果，不包含任何多余的解释文本。JSON 需包含以下结构：
- "profile" (深度建档)：提取人物的性格特征、喜好、雷区等。
- "text_analysis" (聊天文本分析)：分析当前对话的情绪走向、权力关系和潜在意图。
- "reality_feedback" (现实反馈提取)：总结这段关系在现实中的推进进度或遇到的阻碍。`;

    const userMessage = `${nickname ? `分析对象昵称：${nickname}\n\n` : ""}建档材料如下，请输出 JSON 格式的深度建档结果：

${materialText || "暂无建档材料，请基于默认假设生成基础档案。"}`;

    const response = await this.request("deepseek-v4-pro", systemPrompt, [
      { role: "user", content: userMessage },
    ]);

    const jsonData = extractJsonFromResponse(response.content);
    if (!jsonData) {
      throw new Error("Failed to parse JSON from AI response");
    }

    return jsonData as unknown as ProfileAnalysisResult;
  }

  async analyzeText(
    text: string,
    context?: {
      crushNickname?: string;
      relationshipStage?: string;
    }
  ): Promise<{
    emotionalTone: string;
    powerDynamic: string;
    underlyingIntent: string;
    coachAnalysis: {
      strengths: string;
      weaknesses: string;
      suggestedReply: string;
    };
  }> {
    const systemPrompt = `你是一个顶尖的情感沟通教练。请分析用户提供的文本内容，以 JSON 格式返回分析结果。

要求：
- 只返回合法的 JSON，不包含任何解释文本
- coachAnalysis 部分要给出具体的、可操作的建议`;

    const userMessage = `${context?.crushNickname ? `分析对象：${context.crushNickname}\n` : ""}${context?.relationshipStage ? `当前关系阶段：${context.relationshipStage}\n` : ""}\n请分析以下文本：\n\n${text}`;

    const response = await this.request("deepseek-v4-pro", systemPrompt, [
      { role: "user", content: userMessage },
    ]);

    const jsonData = extractJsonFromResponse(response.content);
    if (!jsonData) {
      throw new Error("Failed to parse JSON from AI response");
    }

    return jsonData as Awaited<ReturnType<typeof this.analyzeText>>;
  }

  async quickLineTest(
    userLine: string,
    scenarioType: string,
    context?: {
      crushNickname?: string;
      relationshipStage?: string;
      sendContext?: string;
    }
  ): Promise<{
    riskLevel: string;
    possibleFeeling: string;
    mainRisk: string;
    suggestedLine: string;
    recommendedTiming: string;
    shouldSend: boolean;
  }> {
    const systemPrompt = `你是一个顶尖的情感沟通教练，专注于一句话风险评估。

【输入信息】
- 用户拟发送的话术
- 发送场景（微信/当面/群聊/朋友圈评论）
- 对方昵称和关系阶段

【输出要求】
严格以 JSON 格式返回以下结构：
{
  "riskLevel": "low" | "medium" | "high",
  "possibleFeeling": "对方可能的感受描述",
  "mainRisk": "主要风险点",
  "suggestedLine": "更稳妥的替代表达",
  "recommendedTiming": "推荐发送时机",
  "shouldSend": true | false
}

注意：
- riskLevel 基于话术可能给对方造成的压力程度
- suggestedLine 提供同等意图但更低风险的表达
- shouldSend 综合考虑风险和时机`;

    const userMessage = `【发送场景】${scenarioType}
${context?.sendContext ? `【发送背景】${context.sendContext}\n` : ""}${context?.crushNickname ? `【对方昵称】${context.crushNickname}\n` : ""}${context?.relationshipStage ? `【关系阶段】${context.relationshipStage}\n` : ""}
【拟发送内容】
${userLine}

请以 JSON 格式返回风险评估。`;

    const response = await this.request("deepseek-v4-pro", systemPrompt, [
      { role: "user", content: userMessage },
    ]);

    const jsonData = extractJsonFromResponse(response.content);
    if (!jsonData) {
      throw new Error("Failed to parse JSON from AI response");
    }

    return jsonData as Awaited<ReturnType<typeof this.quickLineTest>>;
  }

  async extractRealityFeedback(
    conversation: Array<{ role: string; content: string }>,
    context?: {
      crushNickname?: string;
      relationshipStage?: string;
    }
  ): Promise<{
    progress: string;
    obstacles: string;
    relationshipSignals: Array<{ type: string; description: string; confidence: number }>;
    nextStepSuggestion: string;
  }> {
    const systemPrompt = `你是一个高级数据分析师，专门分析恋爱关系中的现实反馈。

【输入信息】
- 用户与对方的聊天记录
- 当前关系阶段

【输出要求】
严格以 JSON 格式返回以下结构：
{
  "progress": "关系推进的进度描述",
  "obstacles": "当前遇到的阻碍或问题",
  "relationshipSignals": [
    {"type": "positive|neutral|negative", "description": "信号描述", "confidence": 0-1}
  ],
  "nextStepSuggestion": "下一步行动建议"
}

注意：
- relationshipSignals 只列出明确的、可观察的行为信号
- confidence 反映信号的可靠程度
- 保持保守、客观的判断`;

    const conversationText = conversation
      .map((m) => `${m.role === "user" ? "用户" : "对方"}：${m.content}`)
      .join("\n");

    const userMessage = `${context?.crushNickname ? `【分析对象】${context.crushNickname}\n` : ""}${context?.relationshipStage ? `【当前关系阶段】${context.relationshipStage}\n` : ""}\n【聊天记录】\n${conversationText}\n\n请以 JSON 格式返回分析结果。`;

    const response = await this.request("deepseek-v4-pro", systemPrompt, [
      { role: "user", content: userMessage },
    ]);

    const jsonData = extractJsonFromResponse(response.content);
    if (!jsonData) {
      throw new Error("Failed to parse JSON from AI response");
    }

    return jsonData as Awaited<ReturnType<typeof this.extractRealityFeedback>>;
  }

  async coachAnalysis(
    userMessage: string,
    context?: {
      crushNickname?: string;
      relationshipStage?: string;
      chatHistory?: Array<{ role: string; content: string }>;
    }
  ): Promise<{
    analysis: string;
    suggestedReply: string;
    emotionalSupport: string;
  }> {
    const systemPrompt = `你是一个顶尖的情感沟通教练，以旁观者视角分析用户的消息。

【分析维度】
1. 沟通技巧：表达是否清晰、有无歧义
2. 情绪管理：是否带有过度情绪化表达
3. 边界意识：是否尊重对方空间
4. 推进策略：是否合适当前关系阶段

【输出要求】
严格以 JSON 格式返回：
{
  "analysis": "具体、有洞察力的分析",
  "suggestedReply": "高情商的替代表达",
  "emotionalSupport": "对用户情绪的共情和安抚"
}`;

    const historyText = context?.chatHistory
      ? `\n【对话历史】\n${context.chatHistory.map((m) => `${m.role === "user" ? "用户" : "对方"}：${m.content}`).join("\n")}`
      : "";

    const userMessageText = `【当前消息】${userMessage}${historyText}\n\n请以 JSON 格式返回分析。`;

    const response = await this.request("deepseek-v4-pro", systemPrompt, [
      { role: "user", content: userMessageText },
    ]);

    const jsonData = extractJsonFromResponse(response.content);
    if (!jsonData) {
      throw new Error("Failed to parse JSON from AI response");
    }

    return jsonData as Awaited<ReturnType<typeof this.coachAnalysis>>;
  }
}

let serviceInstance: DeepSeekService | null = null;

export function getDeepSeekService(): DeepSeekService {
  if (!serviceInstance) {
    try {
      serviceInstance = new DeepSeekService();
    } catch (error) {
      log("error", "Failed to initialize DeepSeekService", error);
      throw error;
    }
  }
  return serviceInstance;
}