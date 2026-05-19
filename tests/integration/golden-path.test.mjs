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
let appBaseUrl = "";
let appProcess;
let fakeAiServer;
let fakeAiMode = "valid";

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

    if (systemPrompt.includes("一句话风险评估")) {
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
