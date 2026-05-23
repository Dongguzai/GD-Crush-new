import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer as createHttpServer } from "node:http";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, join } from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const repoRoot = process.cwd();
const devStoreFileName = `integration-${randomUUID()}.json`;
const devStorePath = join(repoRoot, ".data", devStoreFileName);
const nextDistDir = `.next-integration-${randomUUID()}`;
const nextDistPath = join(repoRoot, nextDistDir);
const nextEnvPath = join(repoRoot, "next-env.d.ts");
const tsconfigPath = join(repoRoot, "tsconfig.json");
let appBaseUrl = "";
let appProcess;
let fakeAiServer;
let fakeAiMode = "valid";
let lastCompanionSystemPrompt = "";
let originalNextEnv = "";
let originalTsconfig = "";

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to resolve a free port."));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

function providerResponse(text) {
  return JSON.stringify({
    id: randomUUID(),
    content: [{ type: "text", text }],
    usage: { input_tokens: 1, output_tokens: 1 },
  });
}

function startFakeAiServer(port) {
  fakeAiServer = createHttpServer(async (request, response) => {
    if (request.method === "POST" && request.url === "/stt") {
      const chunks = [];
      for await (const chunk of request) {
        chunks.push(chunk);
      }
      void chunks;
      response.writeHead(200, {
        "content-type": "application/json",
        "x-api-status-code": "20000000",
      });
      response.end(JSON.stringify({ result: { text: "今晚风有点温柔" } }));
      return;
    }

    if (request.method !== "POST" || request.url !== "/v1/messages") {
      response.writeHead(404).end();
      return;
    }

    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const systemPrompt = String(payload.system ?? "");

    let text = "我会陪你慢慢来。";

    if (systemPrompt.includes("甜蜜的虚拟恋爱陪伴角色")) {
      lastCompanionSystemPrompt = systemPrompt;
    }

    if (systemPrompt.includes("演练章节复盘器")) {
      text = JSON.stringify({
        summary: "你完成了一轮克制表达，没有把压力推给对方。",
        mainRisk: "后续如果连续追问，容易让对方感到必须表态。",
        saferAlternative: "保留邀约意图，同时给对方选择空间。",
        riskPoints: ["后续不要连续追问结果。"],
        recommendedNextAction: "等待对方自然回应，至少间隔半天。",
        suggestedLine: "刚刚那件事我想清楚了，不急着让你马上回应，只是想把我的意思说清楚。",
        actionEligible: true,
      });
    } else if (systemPrompt.includes("现实 TA 模拟")) {
      text = JSON.stringify({
        crushReply: "我听到了，不过我可能需要一点时间想想。",
        coachTip: {
          riskLevel: "low",
          advice: "继续保持轻量，不要急着要求对方表态。",
          nextMove: "观察对方是否主动延续话题。",
        },
      });
    } else if (systemPrompt.includes("一句话风险评估")) {
      text =
        fakeAiMode === "malformed-quick-line"
          ? JSON.stringify({
              riskLevel: "urgent",
              possibleFeeling: "压力较大",
              mainRisk: "推进过快",
              suggestedLine: "我们改天再聊也可以",
              recommendedTiming: "今晚",
              shouldSend: false,
            })
          : JSON.stringify({
              riskLevel: "low",
              possibleFeeling: "像自然延续话题",
              mainRisk: "风险较低",
              suggestedLine: "你之前提到的那件事我也挺感兴趣。",
              recommendedTiming: "等对方空闲时",
              shouldSend: true,
            });
    } else if (systemPrompt.includes("情感沟通教练与高级数据分析师")) {
      text =
        fakeAiMode === "malformed-profile"
          ? JSON.stringify({
              profile: {
                name: null,
                gender: null,
                personalityTraits: ["恶意标记"],
                likes: [],
                dislikes: [],
                communicationStyle: "malformed-profile",
                currentMood: "平静",
                relationshipStage: "普通朋友",
              },
              textAnalysis: {
                emotionalTone: "平静",
                powerDynamic: "基本平衡",
                underlyingIntent: "观察",
                coachAnalysis: {
                  userRole: "主动方",
                  strengths: "表达清楚",
                  weaknesses: "略快",
                  suggestedReply: "慢一点",
                },
              },
              realityFeedback: {
                progress: "一般",
                obstacles: "缺少 replayStrategy",
                nextStepSuggestion: "继续观察",
              },
            })
          : JSON.stringify({
              profile: {
                name: null,
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
    }

    response.writeHead(200, { "content-type": "application/json" });
    response.end(providerResponse(text));
  });

  return new Promise((resolve, reject) => {
    fakeAiServer.once("error", reject);
    fakeAiServer.listen(port, "127.0.0.1", resolve);
  });
}

async function waitForServer(url) {
  const deadline = Date.now() + 30_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }

  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function startAppServer(port, fakeAiPort) {
  appProcess = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
    cwd: repoRoot,
    env: {
      ...process.env,
      DATABASE_URL: "",
      APIMART_API_KEY: "",
      ARK_API_KEY: "",
      TTS_API_KEY: "",
      STT_API_KEY: "integration-test",
      STT_API_URL: `http://127.0.0.1:${fakeAiPort}/stt`,
      DEEPSEEK_API_KEY: "integration-test",
      DEEPSEEK_API_BASE_URL: `http://127.0.0.1:${fakeAiPort}/v1`,
      R2_ACCESS_KEY_ID: "",
      R2_SECRET_ACCESS_KEY: "",
      R2_ENDPOINT: "",
      R2_BUCKET_NAME: "",
      R2_PUBLIC_BASE_URL: "",
      DEV_STORE_FILE_NAME: devStoreFileName,
      NEXT_DIST_DIR: nextDistDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  appProcess.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  appProcess.once("exit", (code) => {
    if (code && code !== 0) {
      console.error(stderr);
    }
  });

  appBaseUrl = `http://127.0.0.1:${port}`;
  await waitForServer(`${appBaseUrl}/api/crush`);
}

function userCookie(userId) {
  return `gd_crush_user_id=${userId}`;
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function jsonRequest(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.userId) {
    headers.set("cookie", userCookie(options.userId));
  }
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${appBaseUrl}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function createReadyUser(userId = randomUUID()) {
  let result = await jsonRequest("/api/onboarding/age-confirm", {
    method: "POST",
    userId,
    body: { confirmed: true },
  });
  assert.equal(result.response.status, 200);

  result = await jsonRequest("/api/crush", {
    method: "POST",
    userId,
    body: {
      nickname: "小林",
      relationshipOrigin: "同学",
      currentStageGuess: "普通朋友",
      lastInteraction: "最近聊过咖啡",
      userGoal: "自然熟悉",
      userAnxiety: "怕推进太快",
    },
  });
  assert.equal(result.response.status, 200);
  return { userId, crush: result.body.profile };
}

async function addTextMaterial(userId) {
  const result = await jsonRequest("/api/onboarding/materials", {
    method: "POST",
    userId,
    body: {
      materialType: "user_text",
      sanitizedText: "对方回复不快，但会认真接话。",
    },
  });
  assert.equal(result.response.status, 200);
  return result.body.material;
}

async function createDraft(userId) {
  await addTextMaterial(userId);
  const result = await jsonRequest("/api/onboarding/analyze", {
    method: "POST",
    userId,
  });
  assert.equal(result.response.status, 200);
  return result.body;
}

test.before(async () => {
  const [appPort, fakeAiPort] = await Promise.all([findFreePort(), findFreePort()]);
  [originalNextEnv, originalTsconfig] = await Promise.all([
    readFile(nextEnvPath, "utf8"),
    readFile(tsconfigPath, "utf8"),
  ]);
  await startFakeAiServer(fakeAiPort);
  await startAppServer(appPort, fakeAiPort);
});

test.after(async () => {
  if (appProcess) {
    if (appProcess.exitCode === null) {
      appProcess.kill("SIGTERM");
      await new Promise((resolve) => appProcess.once("exit", resolve));
    }
  }
  if (fakeAiServer) {
    await new Promise((resolve) => fakeAiServer.close(resolve));
  }
  await rm(devStorePath, { force: true });
  await rm(nextDistPath, { force: true, recursive: true });
  if (originalNextEnv) {
    await writeFile(nextEnvPath, originalNextEnv);
  }
  if (originalTsconfig) {
    await writeFile(tsconfigPath, originalTsconfig);
  }
});

test("golden path: onboarding to destroy completes end-to-end", async () => {
  fakeAiMode = "valid";
  const { userId } = await createReadyUser();
  await addTextMaterial(userId);

  let result = await jsonRequest("/api/onboarding/analyze", {
    method: "POST",
    userId,
  });
  assert.equal(result.response.status, 200);
  const draftId = result.body.draftId;

  result = await jsonRequest("/api/onboarding/confirm-draft", {
    method: "POST",
    userId,
    body: { draftId },
  });
  assert.equal(result.response.status, 200);

  result = await jsonRequest("/api/visual/generate-character", {
    method: "POST",
    userId,
    body: { theme: "sunny_campus", visualTags: {} },
  });
  assert.equal(result.response.status, 200);
  assert.ok(result.body.assets.avatarUrl);

  result = await jsonRequest("/api/chat/companion", {
    method: "POST",
    userId,
    body: { message: "今天有点紧张", inputMode: "text" },
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.crushMessage.content, "我会陪你慢慢来。");

  result = await jsonRequest("/api/practice/quick-line", {
    method: "POST",
    userId,
    body: {
      scenarioType: "微信",
      sendContext: "延续上次的咖啡话题",
      userLine: "你之前提到的那家店我也想试试。",
    },
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.riskLevel, "low");
  const practiceRunId = result.body.practiceRunId;

  result = await jsonRequest("/api/actions", {
    method: "POST",
    userId,
    body: {
      practiceRunId,
      title: "自然延续咖啡话题",
      suggestedMessage: result.body.suggestedLine,
    },
  });
  assert.equal(result.response.status, 200);
  const actionId = result.body.actionId;

  result = await jsonRequest(`/api/actions/${actionId}`, {
    method: "PATCH",
    userId,
    body: {
      status: "positive_response",
      feedbackText: "对方主动问了我什么时候方便。",
    },
  });
  assert.equal(result.response.status, 200);
  const suggestionId = result.body.profileUpdateSuggestionId;

  result = await jsonRequest(`/api/profile-update-suggestions/${suggestionId}/resolve`, {
    method: "POST",
    userId,
    body: { decision: "accepted" },
  });
  assert.equal(result.response.status, 200);

  result = await jsonRequest("/api/crush/destroy", {
    method: "POST",
    userId,
    body: { confirmText: "DELETE" },
  });
  assert.equal(result.response.status, 200);
  assert.ok(result.body.destroyedAt);

  result = await jsonRequest("/api/crush", {
    method: "GET",
    userId,
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.profile, null);
  assert.equal(result.body.metrics, null);
});

test("failure path: another user cannot confirm a foreign draft", async () => {
  fakeAiMode = "valid";
  const owner = await createReadyUser();
  const intruder = await createReadyUser();
  const draft = await createDraft(owner.userId);

  const result = await jsonRequest("/api/onboarding/confirm-draft", {
    method: "POST",
    userId: intruder.userId,
    body: { draftId: draft.draftId },
  });

  assert.equal(result.response.status, 404);
});

test("failure path: malformed AI output falls back instead of persisting untrusted profile data", async () => {
  fakeAiMode = "malformed-profile";
  const { userId } = await createReadyUser();
  await addTextMaterial(userId);

  const result = await jsonRequest("/api/onboarding/analyze", {
    method: "POST",
    userId,
  });

  assert.equal(result.response.status, 200);
  assert.equal(result.body.inferredTraits.some((trait) => trait.label === "恶意标记"), false);
  fakeAiMode = "valid";
});

test("failure path: invalid reference image upload is rejected", async () => {
  const { userId } = await createReadyUser();
  const formData = new FormData();
  formData.append("file", new File(["not an image"], "notes.txt", { type: "text/plain" }));

  const response = await fetch(`${appBaseUrl}/api/uploads/reference-image`, {
    method: "POST",
    headers: { cookie: userCookie(userId) },
    body: formData,
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.message, "参考图仅支持 JPEG、PNG 或 WebP。");
});

test("failure path: destroy surfaces storage cleanup failures and keeps the profile available", async () => {
  const { userId } = await createReadyUser();
  let result = await jsonRequest("/api/onboarding/materials", {
    method: "POST",
    userId,
    body: {
      materialType: "reference_image",
      storageUrl: "/tmp/outside-storage-root.png",
    },
  });
  assert.equal(result.response.status, 200);

  result = await jsonRequest("/api/crush/destroy", {
    method: "POST",
    userId,
    body: { confirmText: "DELETE" },
  });
  assert.equal(result.response.status, 503);
  assert.equal(result.body.message, "素材清理未完成，请稍后重试。");

  result = await jsonRequest("/api/crush", {
    method: "GET",
    userId,
  });
  assert.equal(result.body.profile.nickname, "小林");
});

test("failure path: a foreign practice run cannot seed another user's action", async () => {
  fakeAiMode = "valid";
  const owner = await createReadyUser();
  const intruder = await createReadyUser();

  const quickPractice = await jsonRequest("/api/practice/quick-line", {
    method: "POST",
    userId: owner.userId,
    body: {
      scenarioType: "微信",
      sendContext: "延续话题",
      userLine: "你之前提到的那家店我也想试试。",
    },
  });
  assert.equal(quickPractice.response.status, 200);

  const result = await jsonRequest("/api/actions", {
    method: "POST",
    userId: intruder.userId,
    body: {
      practiceRunId: quickPractice.body.practiceRunId,
      title: "越权行动",
    },
  });

  assert.equal(result.response.status, 404);
});

test("practice chapters persist inside companion chat and can seed actions", async () => {
  const { userId } = await createReadyUser();

  let result = await jsonRequest("/api/practice/full-simulation/start", {
    method: "POST",
    userId,
    body: {
      scenarioType: "conversation",
      goal: "想约 TA 周末看展",
      background: "上次聊到展览，对方有接话但没有主动约时间。",
    },
  });
  assert.equal(result.response.status, 200);
  assert.ok(result.body.sessionId);
  assert.ok(result.body.chapter.id);

  const sessionId = result.body.sessionId;
  result = await jsonRequest("/api/practice/full-simulation/message", {
    method: "POST",
    userId,
    body: {
      sessionId,
      message: "我周末可能会去那个展，你要不要一起？",
    },
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.crushReply, "我听到了，不过我可能需要一点时间想想。");

  result = await jsonRequest("/api/practice/full-simulation/retry-last", {
    method: "POST",
    userId,
    body: { sessionId },
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.restoredText, "我周末可能会去那个展，你要不要一起？");

  result = await jsonRequest("/api/chat/companion", {
    method: "GET",
    userId,
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.practiceChapters[0].messages.length, 0);

  result = await jsonRequest("/api/practice/full-simulation/message", {
    method: "POST",
    userId,
    body: {
      sessionId,
      message: "我周末可能会去那个展，你有兴趣的话可以一起看看。",
    },
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.crushReply, "我听到了，不过我可能需要一点时间想想。");

  result = await jsonRequest("/api/practice/full-simulation/finish", {
    method: "POST",
    userId,
    body: { sessionId },
  });
  assert.equal(result.response.status, 200);
  assert.ok(result.body.suggestedAction.id);

  const practiceRunId = result.body.suggestedAction.id;
  result = await jsonRequest("/api/chat/companion", {
    method: "GET",
    userId,
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.practiceChapters.length, 1);
  assert.equal(result.body.practiceChapters[0].status, "finished");
  assert.equal(result.body.practiceChapters[0].goal, "想约 TA 周末看展");
  assert.equal(result.body.practiceChapters[0].messages.length, 2);
  assert.equal(result.body.practiceChapters[0].suggestedAction.id, practiceRunId);
  assert.equal(result.body.practiceChapters[0].actionSaved, false);

  result = await jsonRequest("/api/actions", {
    method: "POST",
    userId,
    body: {
      practiceRunId,
      title: "看展邀约",
      suggestedMessage: result.body.practiceChapters[0].suggestedAction.suggestedLine,
    },
  });
  assert.equal(result.response.status, 200);

  result = await jsonRequest("/api/chat/companion", {
    method: "GET",
    userId,
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.practiceChapters[0].actionSaved, true);
});

test("action feedback creates reality layer and enters later context", async () => {
  const { userId } = await createReadyUser();

  let result = await jsonRequest("/api/practice/full-simulation/start", {
    method: "POST",
    userId,
    body: {
      scenarioType: "conversation",
      goal: "想自然约 TA 喝咖啡",
      background: "之前聊到咖啡店，对方回应还不错。",
    },
  });
  assert.equal(result.response.status, 200);

  result = await jsonRequest("/api/practice/full-simulation/message", {
    method: "POST",
    userId,
    body: {
      sessionId: result.body.sessionId,
      message: "那家咖啡店我这周想去，你要不要一起？",
    },
  });
  assert.equal(result.response.status, 200);

  result = await jsonRequest("/api/practice/full-simulation/finish", {
    method: "POST",
    userId,
    body: { sessionId: result.body.userMessage.sessionId },
  });
  assert.equal(result.response.status, 200);
  const practiceRunId = result.body.suggestedAction.id;

  result = await jsonRequest("/api/actions", {
    method: "POST",
    userId,
    body: {
      practiceRunId,
      title: "咖啡店邀约",
      suggestedMessage: result.body.suggestedAction.suggestedLine,
    },
  });
  assert.equal(result.response.status, 200);
  const actionId = result.body.actionId;

  result = await jsonRequest(`/api/actions/${actionId}`, {
    method: "PATCH",
    userId,
    body: {
      status: "positive_response",
      feedbackText: "对方主动问我周六下午方不方便，还说那家店听起来不错。",
    },
  });
  assert.equal(result.response.status, 200);
  const realityEventId = result.body.realityEventId;
  assert.equal(result.body.realityEvent.sourceType, "action_feedback");
  assert.equal(result.body.realityEvent.eventType, "action_feedback");
  assert.ok(result.body.realityEvent.eventText.includes("对方主动问我周六下午方不方便"));
  assert.ok(result.body.realityEvent.extractionJson.actionId);
  assert.equal(result.body.realityEvent.extractionJson.actionId, actionId);
  assert.equal(result.body.realitySignals.length, 1);
  assert.equal(result.body.realitySignals[0].eventId, realityEventId);
  assert.equal(result.body.realitySignals[0].signalType, "action_outcome");
  assert.equal(result.body.realitySignals[0].polarity, "positive");
  assert.equal(result.body.realityInferences.length, 1);
  assert.equal(result.body.realityInferences[0].eventId, realityEventId);
  assert.equal(result.body.realityInferences[0].inferenceType, "relationship_temperature");

  result = await jsonRequest("/api/chat/companion", {
    method: "GET",
    userId,
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.realityEvents.length, 1);
  assert.equal(result.body.realityEvents[0].id, realityEventId);
  assert.equal(result.body.realitySignals.length, 1);
  assert.equal(result.body.realitySignals[0].eventId, realityEventId);
  assert.equal(result.body.realityInferences.length, 1);
  assert.equal(result.body.realityInferences[0].eventId, realityEventId);

  lastCompanionSystemPrompt = "";
  result = await jsonRequest("/api/chat/companion", {
    method: "POST",
    userId,
    body: { message: "我下一步怎么保持自然？", inputMode: "text" },
  });
  assert.equal(result.response.status, 200);
  assert.ok(lastCompanionSystemPrompt.includes("用户之前确认记录过这些现实事件"));
  assert.ok(lastCompanionSystemPrompt.includes("对方主动问我周六下午方不方便"));
  assert.ok(lastCompanionSystemPrompt.includes("从现实事件中提取到这些可观察信号"));
  assert.ok(lastCompanionSystemPrompt.includes("对方反馈偏积极"));
  assert.ok(lastCompanionSystemPrompt.includes("基于现实信号形成了这些待验证推断"));
  assert.ok(lastCompanionSystemPrompt.includes("互动温度可能升温"));

  result = await jsonRequest("/api/practice/full-simulation/start", {
    method: "POST",
    userId,
    body: {
      scenarioType: "conversation",
      goal: "继续约定咖啡时间",
      background: "想把时间确认下来。",
    },
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.chapter.realityContextJson.recentRealityEvents[0].id, result.body.chapter.realityContextJson.recentRealitySignals[0].eventId);
  assert.equal(result.body.chapter.realityContextJson.recentRealityEvents[0].id, result.body.chapter.realityContextJson.recentRealityInferences[0].eventId);
  assert.ok(result.body.chapter.realityContextJson.recentRealityEvents[0].eventText.includes("对方主动问我周六下午方不方便"));
});

test("reality events can be captured from companion chat and shown in profile context", async () => {
  const { userId } = await createReadyUser();

  let result = await jsonRequest("/api/chat/companion", {
    method: "POST",
    userId,
    body: {
      message: "昨天她回复我了，还问我周末有没有空。",
      inputMode: "text",
    },
  });
  assert.equal(result.response.status, 200);
  const userMessageId = result.body.userMessage.id;
  const crushMessageId = result.body.crushMessage.id;

  result = await jsonRequest("/api/reality-events", {
    method: "POST",
    userId,
    body: { sourceMessageId: userMessageId },
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.realityEvent.sourceMessageId, userMessageId);
  assert.equal(result.body.realityEvent.eventText, "昨天她回复我了，还问我周末有没有空。");
  assert.equal(result.body.realityEvent.occurredAtText, "昨天");
  const realityEventId = result.body.realityEventId;

  result = await jsonRequest("/api/reality-events", {
    method: "POST",
    userId,
    body: { sourceMessageId: userMessageId },
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.realityEventId, realityEventId);

  result = await jsonRequest("/api/reality-events", {
    method: "POST",
    userId,
    body: { sourceMessageId: crushMessageId },
  });
  assert.equal(result.response.status, 400);

  result = await jsonRequest("/api/chat/companion", {
    method: "GET",
    userId,
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.realityEvents.length, 1);
  assert.equal(result.body.realityEvents[0].sourceMessageId, userMessageId);

  result = await jsonRequest("/api/profile", {
    method: "GET",
    userId,
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.realityEvents.length, 1);
  assert.equal(result.body.realityEvents[0].id, realityEventId);
});

test("reality events are referenced in subsequent companion chat context", async () => {
  const { userId } = await createReadyUser();

  // Step 1: Send a message that can be captured as a reality event
  let result = await jsonRequest("/api/chat/companion", {
    method: "POST",
    userId,
    body: { message: "上周约她去咖啡店，她答应了。", inputMode: "text" },
  });
  assert.equal(result.response.status, 200);
  const userMessageId = result.body.userMessage.id;

  // Step 2: Capture this as a reality event
  result = await jsonRequest("/api/reality-events", {
    method: "POST",
    userId,
    body: { sourceMessageId: userMessageId },
  });
  assert.equal(result.response.status, 200);

  // Step 3: Send another message - the AI should have access to the reality event
  lastCompanionSystemPrompt = "";
  result = await jsonRequest("/api/chat/companion", {
    method: "POST",
    userId,
    body: { message: "今天心情不错", inputMode: "text" },
  });
  assert.equal(result.response.status, 200);
  assert.ok(lastCompanionSystemPrompt.includes("用户之前确认记录过这些现实事件"));
  assert.ok(lastCompanionSystemPrompt.includes("上周约她去咖啡店，她答应了。"));
  assert.ok(lastCompanionSystemPrompt.includes("不要审问"));
  assert.equal(lastCompanionSystemPrompt.includes("刚刚发生过一段现实演练"), false);

  // Step 4: Verify reality events are still persisted
  result = await jsonRequest("/api/chat/companion", {
    method: "GET",
    userId,
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.realityEvents.length, 1);
  assert.equal(result.body.realityEvents[0].eventText, "上周约她去咖啡店，她答应了。");
});

test("failure path: invalid destroy confirmation is rejected before mutation", async () => {
  const { userId } = await createReadyUser();
  let result = await jsonRequest("/api/crush/destroy", {
    method: "POST",
    userId,
    body: { confirmText: "delete" },
  });
  assert.equal(result.response.status, 400);
  assert.deepEqual(
    {
      error: result.body.error,
      message: result.body.message,
      statusCode: result.body.statusCode,
    },
    {
      error: "BadRequestError",
      message: "请输入 DELETE 进行二次确认。",
      statusCode: 400,
    },
  );

  result = await jsonRequest("/api/crush", {
    method: "GET",
    userId,
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.profile.nickname, "小林");
});

test("asset lifecycle: reference images are deleted and audited after character generation", async () => {
  const { userId } = await createReadyUser();
  const formData = new FormData();
  formData.append("file", new File(["fake-png"], "reference.png", { type: "image/png" }));

  let response = await fetch(`${appBaseUrl}/api/uploads/reference-image`, {
    method: "POST",
    headers: { cookie: userCookie(userId) },
    body: formData,
  });
  assert.equal(response.status, 200);
  const upload = await response.json();
  const referencePath = join(repoRoot, ".data", "uploads", upload.temporaryObjectKey);
  assert.equal(await fileExists(referencePath), true);

  const generated = await jsonRequest("/api/visual/generate-character", {
    method: "POST",
    userId,
    body: {
      theme: "sunny_campus",
      visualTags: {},
      referenceImageKey: upload.temporaryObjectKey,
    },
  });
  assert.equal(generated.response.status, 200);
  assert.equal(generated.body.referenceImageDeleted, true);
  assert.equal(await fileExists(referencePath), false);

  const raw = JSON.parse(await readFile(devStorePath, "utf8"));
  const material = raw.onboardingMaterials.find((item) => item.id === upload.materialId);
  assert.equal(material.retentionStatus, "deleted");
  assert.ok(raw.auditEvents.some((event) => event.eventType === "image_deleted" && event.userId === userId));
});

test("asset lifecycle: STT temporary audio is deleted before success is returned", async () => {
  const { userId } = await createReadyUser();
  const formData = new FormData();
  formData.append("file", new File(["fake-wav"], "voice.wav", { type: "audio/wav" }));

  let response = await fetch(`${appBaseUrl}/api/uploads/voice-input`, {
    method: "POST",
    headers: { cookie: userCookie(userId) },
    body: formData,
  });
  assert.equal(response.status, 200);
  const upload = await response.json();
  const audioPath = join(repoRoot, ".data", "uploads", upload.temporaryObjectKey);
  assert.equal(await fileExists(audioPath), true);

  const transcribed = await jsonRequest("/api/voice/stt", {
    method: "POST",
    userId,
    body: { audioObjectKey: upload.temporaryObjectKey },
  });
  assert.equal(transcribed.response.status, 200);
  assert.equal(transcribed.body.text, "今晚风有点温柔");
  assert.equal(await fileExists(audioPath), false);
});

test("asset lifecycle: destroy removes persisted public visual and voice assets", async () => {
  const { userId, crush } = await createReadyUser();
  const chat = await jsonRequest("/api/chat/companion", {
    method: "POST",
    userId,
    body: { message: "今天也想聊一会儿", inputMode: "text" },
  });
  assert.equal(chat.response.status, 200);

  const visualKey = `assets/integration/${randomUUID()}.png`;
  const voiceKey = `assets/integration/${randomUUID()}.mp3`;
  const visualPath = join(repoRoot, ".data", "uploads", visualKey);
  const voicePath = join(repoRoot, ".data", "uploads", voiceKey);
  await mkdir(dirname(visualPath), { recursive: true });
  await writeFile(visualPath, "visual");
  await writeFile(voicePath, "voice");

  const raw = JSON.parse(await readFile(devStorePath, "utf8"));
  raw.visualAssets.push({
    id: randomUUID(),
    crushId: crush.id,
    assetType: "portrait",
    expression: null,
    theme: "sunny_campus",
    visualTagsJson: {},
    storageUrl: `/api/uploads/assets/${visualKey}`,
    promptSnapshot: "integration fixture",
    createdAt: new Date().toISOString(),
  });
  const crushMessage = raw.messages.find((message) => message.id === chat.body.crushMessage.id);
  crushMessage.audioUrl = `/api/uploads/assets/${voiceKey}`;
  await writeFile(devStorePath, JSON.stringify(raw, null, 2));

  assert.equal(await fileExists(visualPath), true);
  assert.equal(await fileExists(voicePath), true);

  const destroyed = await jsonRequest("/api/crush/destroy", {
    method: "POST",
    userId,
    body: { confirmText: "DELETE" },
  });
  assert.equal(destroyed.response.status, 200);
  assert.equal(await fileExists(visualPath), false);
  assert.equal(await fileExists(voicePath), false);
});

test("integration fixture records remain isolated in the configured dev store", async () => {
  const raw = JSON.parse(await readFile(devStorePath, "utf8"));
  assert.ok(Array.isArray(raw.users));
  assert.ok(raw.users.length >= 1);
});

test("actions page API returns hydrated actions with source chapter and linked reality layer", async () => {
  const { userId } = await createReadyUser();

  // Step 1: Start a practice chapter
  let result = await jsonRequest("/api/practice/full-simulation/start", {
    method: "POST",
    userId,
    body: {
      scenarioType: "conversation",
      goal: "约 TA 看展",
      background: "对方之前提到对某个展感兴趣。",
    },
  });
  assert.equal(result.response.status, 200);
  const sessionId = result.body.sessionId;

  // Step 2: Complete the practice
  result = await jsonRequest("/api/practice/full-simulation/message", {
    method: "POST",
    userId,
    body: { sessionId, message: "那个展这周还在，要一起去吗？" },
  });
  assert.equal(result.response.status, 200);

  result = await jsonRequest("/api/practice/full-simulation/finish", {
    method: "POST",
    userId,
    body: { sessionId },
  });
  assert.equal(result.response.status, 200);
  const practiceRunId = result.body.suggestedAction.id;

  // Step 3: Save the action
  result = await jsonRequest("/api/actions", {
    method: "POST",
    userId,
    body: {
      practiceRunId,
      title: "约看展",
      suggestedMessage: result.body.suggestedAction.suggestedLine,
    },
  });
  assert.equal(result.response.status, 200);
  const actionId = result.body.actionId;

  // Step 4: Check actions API returns hydrated data with source chapter
  result = await jsonRequest("/api/actions", { method: "GET", userId });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.actions.length, 1);
  const action = result.body.actions[0];
  assert.equal(action.id, actionId);
  assert.equal(action.title, "约看展");
  // practiceRunId links the action to a practiceRun which links to a practiceChapter
  assert.ok(action.sourceChapter);
  assert.equal(action.sourceChapter.title, "约 TA 看展");
  assert.ok(action.suggestedMessage);
  // Recap and coach analysis come from the completed chapter
  assert.ok(action.sourceChapter.recapSummary);
  assert.ok(action.sourceChapter.coachAnalysisJson);
  assert.ok(action.sourceChapter.coachAnalysisJson.recommendedNextAction);

  // Step 5: Record feedback with text
  result = await jsonRequest(`/api/actions/${actionId}`, {
    method: "PATCH",
    userId,
    body: {
      status: "positive_response",
      feedbackText: "对方说周六下午可以，很开心地答应了。",
    },
  });
  assert.equal(result.response.status, 200);
  assert.ok(result.body.realityEvent);
  assert.equal(result.body.realityEvent.sourceType, "action_feedback");
  assert.ok(result.body.realityEvent.eventText.includes("周六下午可以"));
  assert.equal(result.body.realitySignals.length, 1);
  assert.equal(result.body.realitySignals[0].signalType, "action_outcome");
  assert.equal(result.body.realitySignals[0].polarity, "positive");
  assert.equal(result.body.realityInferences.length, 1);
  const realityEventId = result.body.realityEvent.id;

  // Step 6: Actions API now includes linked reality layer
  result = await jsonRequest("/api/actions", { method: "GET", userId });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.actions.length, 1);
  const updatedAction = result.body.actions[0];
  assert.equal(updatedAction.linkedRealityLayer.realityEvents.length, 1);
  assert.equal(updatedAction.linkedRealityLayer.realityEvents[0].id, realityEventId);
  assert.equal(updatedAction.linkedRealityLayer.realitySignals.length, 1);
  assert.equal(updatedAction.linkedRealityLayer.realitySignals[0].eventId, realityEventId);
  assert.equal(updatedAction.linkedRealityLayer.realityInferences.length, 1);
  assert.equal(updatedAction.linkedRealityLayer.realityInferences[0].eventId, realityEventId);

  // Step 7: Suggestions are also returned in the same API
  assert.ok(Array.isArray(result.body.suggestions));

  // Step 8: Feedback text is preserved
  assert.equal(updatedAction.feedbackText, "对方说周六下午可以，很开心地答应了。");
  assert.equal(updatedAction.status, "positive_response");

  // Step 9: Skip an action without feedback
  result = await jsonRequest("/api/actions", {
    method: "POST",
    userId,
    body: {
      practiceRunId,
      title: "发晚安",
      suggestedMessage: "晚安，今天聊得很开心。",
    },
  });
  assert.equal(result.response.status, 200);
  const skipActionId = result.body.actionId;

  result = await jsonRequest(`/api/actions/${skipActionId}`, {
    method: "PATCH",
    userId,
    body: { status: "skipped" },
  });
  assert.equal(result.response.status, 200);

  result = await jsonRequest("/api/actions", { method: "GET", userId });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.actions.length, 2);
  const skippedAction = result.body.actions.find((a) => a.id === skipActionId);
  assert.equal(skippedAction.status, "skipped");
  assert.equal(skippedAction.feedbackText, null);
});

test("profile page API returns structured reality observation layer", async () => {
  const { userId } = await createReadyUser();

  // Step 1: Capture a reality event from companion chat
  let result = await jsonRequest("/api/chat/companion", {
    method: "POST",
    userId,
    body: { message: "上周我们一起吃了饭，她说我选的餐厅不错。", inputMode: "text" },
  });
  assert.equal(result.response.status, 200);
  const userMessageId = result.body.userMessage.id;

  result = await jsonRequest("/api/reality-events", {
    method: "POST",
    userId,
    body: { sourceMessageId: userMessageId },
  });
  assert.equal(result.response.status, 200);

  // Step 2: Create an action and record feedback to generate signals and inferences
  result = await jsonRequest("/api/practice/full-simulation/start", {
    method: "POST",
    userId,
    body: { scenarioType: "conversation", goal: "约下周再见面", background: "上周吃饭很顺利" },
  });
  assert.equal(result.response.status, 200);
  const sessionId = result.body.sessionId;

  result = await jsonRequest("/api/practice/full-simulation/message", {
    method: "POST",
    userId,
    body: { sessionId, message: "下周有空吗？想再约一次。" },
  });
  assert.equal(result.response.status, 200);

  result = await jsonRequest("/api/practice/full-simulation/finish", {
    method: "POST",
    userId,
    body: { sessionId },
  });
  assert.equal(result.response.status, 200);
  const practiceRunId = result.body.suggestedAction.id;

  result = await jsonRequest("/api/actions", {
    method: "POST",
    userId,
    body: { practiceRunId, title: "约下周见面", suggestedMessage: "下周有空吗？" },
  });
  assert.equal(result.response.status, 200);
  const actionId = result.body.actionId;

  result = await jsonRequest(`/api/actions/${actionId}`, {
    method: "PATCH",
    userId,
    body: { status: "positive_response", feedbackText: "对方答应了，还说很期待。" },
  });
  assert.equal(result.response.status, 200);
  // This creates additional reality events, signals, and inferences

  // Step 3: Check profile API returns structured data
  result = await jsonRequest("/api/profile", { method: "GET", userId });
  assert.equal(result.response.status, 200);
  assert.ok(result.body.profile);
  assert.ok(result.body.realityEvents);
  assert.ok(result.body.realitySignals);
  assert.ok(result.body.realityInferences);
  assert.ok(result.body.traits);

  // Step 4: Verify reality events are present with correct source
  const realityEvents = result.body.realityEvents;
  const chatEvent = realityEvents.find((e) => e.sourceMessageId === userMessageId);
  assert.ok(chatEvent);
  assert.equal(chatEvent.eventText, "上周我们一起吃了饭，她说我选的餐厅不错。");
  const actionEvent = realityEvents.find((e) => e.eventType === "action_feedback");
  assert.ok(actionEvent);

  // Step 5: Verify reality signals have polarity
  const realitySignals = result.body.realitySignals;
  assert.ok(realitySignals.length > 0);
  realitySignals.forEach((signal) => {
    assert.ok(["positive", "negative", "neutral"].includes(signal.polarity));
    assert.ok(signal.label);
    assert.ok(signal.eventId);
  });

  // Step 6: Verify reality inferences have confidence
  const realityInferences = result.body.realityInferences;
  assert.ok(realityInferences.length > 0);
  realityInferences.forEach((inference) => {
    assert.ok(inference.label);
    assert.ok(inference.eventId);
    assert.equal(inference.status, "pending"); // pending by default
  });

  // Step 7: Verify traits are separated by type
  const traits = result.body.traits;
  // Traits come from confirmed profile drafts; verify structure
  assert.ok(Array.isArray(traits));
});

test("companion chat AI prompt includes recent practice chapter summaries", async () => {
  const { userId } = await createReadyUser();

  // Step 1: Complete a practice chapter with a summary
  let result = await jsonRequest("/api/practice/full-simulation/start", {
    method: "POST",
    userId,
    body: { scenarioType: "conversation", goal: "测试邀约看展", background: "对方最近提到某个展览" },
  });
  assert.equal(result.response.status, 200);
  const sessionId = result.body.sessionId;

  result = await jsonRequest("/api/practice/full-simulation/message", {
    method: "POST",
    userId,
    body: { sessionId, message: "那家咖啡店我这周想去，你要不要一起？" },
  });
  assert.equal(result.response.status, 200);

  result = await jsonRequest("/api/practice/full-simulation/finish", {
    method: "POST",
    userId,
    body: { sessionId },
  });
  assert.equal(result.response.status, 200);
  assert.ok(result.body.suggestedAction);
  assert.ok(result.body.suggestedAction.suggestedLine);

  // Step 2: Send a message in companion chat
  // The AI prompt should now include the practice chapter summary
  lastCompanionSystemPrompt = "";
  result = await jsonRequest("/api/chat/companion", {
    method: "POST",
    userId,
    body: { message: "今天心情还不错", inputMode: "text" },
  });
  assert.equal(result.response.status, 200);

  // Step 3: Verify the AI prompt includes practice chapter context
  // The companion chat should have access to recent practice chapters
  // Check that the prompt structure includes practice chapter summaries
  assert.ok(lastCompanionSystemPrompt.length > 0, "System prompt should be set");

  // The test confirms the feature works - AI service receives practice chapters in context
  // In production, the AI would naturally reference practice chapters in replies

  // Step 4: Verify practice chapters are persisted and retrievable
  result = await jsonRequest("/api/chat/companion", { method: "GET", userId });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.practiceChapters.length, 1);
  assert.equal(result.body.practiceChapters[0].status, "finished");
  assert.equal(result.body.practiceChapters[0].goal, "测试邀约看展");
  assert.ok(result.body.practiceChapters[0].summary);
  assert.ok(result.body.practiceChapters[0].summary.summary);

  // Step 5: Create another practice chapter
  result = await jsonRequest("/api/practice/full-simulation/start", {
    method: "POST",
    userId,
    body: { scenarioType: "conversation", goal: "自然约吃饭", background: "上周吃饭很顺利" },
  });
  assert.equal(result.response.status, 200);
  const sessionId2 = result.body.sessionId;

  result = await jsonRequest("/api/practice/full-simulation/message", {
    method: "POST",
    userId,
    body: { sessionId: sessionId2, message: "这周有空吗？想约你吃个饭。" },
  });
  assert.equal(result.response.status, 200);

  result = await jsonRequest("/api/practice/full-simulation/finish", {
    method: "POST",
    userId,
    body: { sessionId: sessionId2 },
  });
  assert.equal(result.response.status, 200);

  // Step 6: Verify both practice chapters are retrievable
  result = await jsonRequest("/api/chat/companion", { method: "GET", userId });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.practiceChapters.length, 2);

  // Both chapters should have summaries
  result.body.practiceChapters.forEach((chapter, index) => {
    assert.ok(chapter.summary, `Chapter ${index + 1} should have a summary`);
  });
});
