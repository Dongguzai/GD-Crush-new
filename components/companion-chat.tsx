"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Mic, Play, Save, Send, Sparkles, Star } from "lucide-react";
import { StatePanel } from "@/components/state-panel";
import { getClientErrorMessage, readApiResponse } from "@/lib/api-client";

type Message = {
  id: string;
  role: "user" | "crush" | "coach" | "system";
  content: string;
  audioUrl?: string | null;
};

type Profile = {
  nickname: string;
};

type CoachTip = {
  riskLevel?: string;
  advice?: string;
  nextMove?: string;
};

type PracticeThreadMessage = {
  id: string;
  role: "user" | "crush";
  content: string;
  coachTip?: CoachTip | null;
};

type PracticeSummary = {
  summary?: string;
  mainRisk?: string;
  saferAlternative?: string;
  riskPoints?: string[];
  recommendedNextAction?: string;
  actionEligible?: boolean;
};

type SuggestedPracticeAction = {
  id: string;
  suggestedLine?: string | null;
  coachAnalysisJson?: PracticeSummary | null;
};

/**
 * A light-weight system UI invitation that appears below TA's message
 * when the context suggests practicing a real communication scenario.
 */
type PracticeInvite = {
  sourceMessageId: string;
  goal: string;
  background: string;
};

type RealityEvent = {
  id: string;
  sourceMessageId?: string | null;
  eventText: string;
  eventType: string;
  occurredAtText?: string | null;
  status: string;
  createdAt: string | Date;
};

type PracticeChapter = {
  id: string;
  status: "draft" | "active" | "finished";
  scenarioType: string;
  goal: string;
  background: string;
  sessionId?: string | null;
  messages: PracticeThreadMessage[];
  coachTips: CoachTip[];
  summary?: PracticeSummary | null;
  suggestedAction?: SuggestedPracticeAction | null;
  actionSaved?: boolean;
  /** Set when chapter was created from a TA invite to track trigger source for the API */
  fromInvite?: boolean;
  inviteSourceMessageId?: string | null;
};

type VoiceState = "idle" | "recording" | "processing";

type CompanionChatPayload = {
  profile: Profile | null;
  messages: Message[];
  practiceChapters?: PracticeChapter[];
  realityEvents?: RealityEvent[];
  userSettings?: {
    autoPlayCompanionVoice: boolean;
    voiceSpeed: string;
    voiceEmotionLevel: string;
    voiceAgeStyle: string;
  };
};

function mergeAudioChunks(chunks: Float32Array[]) {
  const totalLength = chunks.reduce((length, chunk) => length + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

function encodeWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, value: string) {
    for (let index = 0; index < value.length; index++) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function createPracticeChapter(): PracticeChapter {
  return {
    id: `practice-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    status: "draft",
    scenarioType: "conversation",
    goal: "",
    background: "",
    sessionId: null,
    messages: [],
    coachTips: [],
    summary: null,
    suggestedAction: null,
    actionSaved: false,
  };
}

function buildPracticeSummaryText(chapter: PracticeChapter, summary?: PracticeSummary | null) {
  const lines = [
    chapter.goal.trim() ? `刚才演练的是：${chapter.goal.trim()}` : "刚才完成了一段现实 TA 演练。",
    summary?.summary,
    summary?.recommendedNextAction ? `建议下一步：${summary.recommendedNextAction}` : undefined,
  ].filter(Boolean);

  return lines.join("\n");
}

function latestPracticeChapter(chapters?: PracticeChapter[]) {
  return chapters?.length ? chapters[chapters.length - 1] : null;
}

function getRecordedRealityMessageIds(events?: RealityEvent[]) {
  return new Set(events?.map((event) => event.sourceMessageId).filter((id): id is string => Boolean(id)) ?? []);
}

function shouldSuggestRealityCapture(message: Message) {
  if (message.role !== "user") {
    return false;
  }

  const content = message.content.trim();
  if (content.length < 8 || content.length > 500) {
    return false;
  }

  const pureFeelingPattern =
    /^(今天|刚刚|刚才|最近)?\s*(有点|很|好)?\s*(累|难过|焦虑|紧张|烦|开心|想你|喜欢你|害怕|不安)[。！？!?\s]*$/;
  if (pureFeelingPattern.test(content)) {
    return false;
  }

  const hasRealityTimeCue =
    /(刚刚|刚才|今天|昨天|前天|上次|最近|这周|周末|今晚|早上|中午|下午|晚上|那天|现实|微信|朋友圈|上课|下课|见面)/.test(
      content,
    );
  const hasInteractionCue =
    /(回复|回我|没回|已读|发(了)?消息|说|问|约|见面|碰到|遇到|看见|看了|笑|一起|主动|给我|聊|吃饭|喝咖啡|看展|打电话)/.test(
      content,
    );
  const isMostlySpeculation =
    /(如果|假如|要是|梦到|幻想|会不会|是不是|可能|也许|我猜|我觉得|我感觉|希望)/.test(content) &&
    !hasInteractionCue;

  return hasRealityTimeCue && hasInteractionCue && !isMostlySpeculation;
}

export function CompanionChat() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [autoPlay, setAutoPlay] = useState(true);
  const [practiceChapter, setPracticeChapter] = useState<PracticeChapter | null>(null);
  const [practiceInvite, setPracticeInvite] = useState<PracticeInvite | null>(null);
  const [dismissedInviteMessageIds, setDismissedInviteMessageIds] = useState<Set<string>>(new Set());
  const [recordedRealityMessageIds, setRecordedRealityMessageIds] = useState<Set<string>>(new Set());
  const [recordingRealityMessageId, setRecordingRealityMessageId] = useState<string | null>(null);
  const [practiceBusyLabel, setPracticeBusyLabel] = useState<string | null>(null);
  const [recentPracticeSummary, setRecentPracticeSummary] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatNotice, setChatNotice] = useState<{
    tone: "error" | "success";
    title: string;
    description: string;
    retry?: () => void;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const latestAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const isPracticeDraft = practiceChapter?.status === "draft";
  const isPracticeActive = practiceChapter?.status === "active";
  const composerDisabled = loadState !== "ready" || !profile || isPracticeDraft;
  const headerTitle =
    loadState === "loading"
      ? "正在连接 TA"
      : loadState === "error"
        ? "TA 暂时没连上"
        : (profile?.nickname ?? "等待你的 TA");
  const composerPlaceholder =
    loadState === "loading"
      ? "等 TA 连上，再从这里开始聊天..."
      : loadState === "error"
        ? "聊天暂时不可用，重新加载后再继续..."
        : isPracticeDraft
          ? "先确认这段要演什么..."
          : isPracticeActive
            ? "现在是在演练里，像现实中那样说一句..."
            : profile
              ? recentPracticeSummary
                ? "已经回到日常聊天，继续和 TA 说..."
                : "输入一句想说的话..."
              : "先创建 TA，再从这里开始聊天...";

  const loadMessages = useCallback(async () => {
    try {
      const data = await readApiResponse<CompanionChatPayload>(
        await fetch("/api/chat/companion"),
        "聊天记录加载失败，请稍后重试。",
      );
      setProfile(data.profile ?? null);
      setMessages(data.messages ?? []);
      setPracticeChapter(latestPracticeChapter(data.practiceChapters));
      setRecordedRealityMessageIds(getRecordedRealityMessageIds(data.realityEvents));
      // Set autoPlay from user settings if available, otherwise default to true
      if (data.userSettings !== undefined) {
        setAutoPlay(data.userSettings.autoPlayCompanionVoice);
      }
      setLoadState("ready");
    } catch (error) {
      setLoadState("error");
      setLoadError(getClientErrorMessage(error, "聊天记录加载失败，请稍后重试。"));
    }
  }, []);

  function retryLoadMessages() {
    setLoadState("loading");
    setLoadError(null);
    void loadMessages();
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/chat/companion")
      .then((response) =>
        readApiResponse<CompanionChatPayload>(
          response,
          "聊天记录加载失败，请稍后重试。",
        ),
      )
      .then((data) => {
        if (!cancelled) {
          setProfile(data.profile ?? null);
          setMessages(data.messages ?? []);
          setPracticeChapter(latestPracticeChapter(data.practiceChapters));
          setRecordedRealityMessageIds(getRecordedRealityMessageIds(data.realityEvents));
          setLoadState("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadState("error");
          setLoadError(getClientErrorMessage(error, "聊天记录加载失败，请稍后重试。"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      processorRef.current?.disconnect();
      audioSourceRef.current?.disconnect();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close().catch(() => undefined);
    };
  }, []);

  function synthesizeVoice(message: Message) {
    startTransition(async () => {
      try {
        const voice = await readApiResponse<{ audioUrl: string }>(
          await fetch("/api/voice/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: message.id, text: message.content }),
          }),
          "语音生成失败，请稍后重试。",
        );
        setMessages((current) =>
          current.map((item) => (item.id === message.id ? { ...item, audioUrl: voice.audioUrl } : item)),
        );
        setChatNotice({
          tone: "success",
          title: "语音已补上",
          description: "这条回复现在可以播放了。",
        });

        if (autoPlay) {
          setTimeout(() => {
            latestAudioRef.current?.play().catch(() => undefined);
          }, 80);
        }
      } catch (error) {
        setChatNotice({
          tone: "error",
          title: "文字已送达，但语音暂时不可用",
          description: getClientErrorMessage(error, "语音生成失败，请稍后重试。"),
          retry: () => synthesizeVoice(message),
        });
      }
    });
  }

  function send(message: string, inputMode: "text" | "voice" = "text") {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    if (isPracticeActive) {
      sendPracticeMessage(trimmedMessage);
      return;
    }

    setChatNotice(null);
    setText("");
    startTransition(async () => {
      try {
        const data = await readApiResponse<{ userMessage: Message; crushMessage: Message; practiceInvite?: PracticeInvite }>(
          await fetch("/api/chat/companion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: trimmedMessage, inputMode, recentPracticeSummary }),
          }),
          "消息发送失败，请稍后重试。",
        );
        setMessages((current) => [...current, data.userMessage, data.crushMessage]);
        synthesizeVoice(data.crushMessage);

        // Handle practice invite if returned and not dismissed for this message
        if (
          data.practiceInvite &&
          !dismissedInviteMessageIds.has(data.practiceInvite.sourceMessageId) &&
          !practiceChapter
        ) {
          setPracticeInvite(data.practiceInvite);
        }
      } catch (error) {
        setText(trimmedMessage);
        setChatNotice({
          tone: "error",
          title: "这句话还没发出去",
          description: getClientErrorMessage(error, "消息发送失败，请稍后重试。"),
          retry: () => send(trimmedMessage, inputMode),
        });
      }
    });
  }

  function openPracticeChapter() {
    setChatNotice(null);
    // Clear any pending invite when practice chapter is opened
    setPracticeInvite(null);
    setPracticeChapter((current) => {
      if (!current || current.status === "finished") {
        return createPracticeChapter();
      }

      return current;
    });
  }

  /**
   * Opens practice chapter with pre-filled goal/background from a TA invite.
   * Triggered when user clicks the system invite UI.
   */
  function acceptPracticeInvite() {
    if (!practiceInvite) return;

    setChatNotice(null);
    // Dismiss this invite so it doesn't show again
    setDismissedInviteMessageIds((prev) => new Set([...prev, practiceInvite.sourceMessageId]));
    // Clear the invite
    setPracticeInvite(null);
    // Create practice chapter with pre-filled goal/background and invite metadata
    setPracticeChapter({
      id: `practice-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      status: "draft",
      scenarioType: "conversation",
      goal: practiceInvite.goal,
      background: practiceInvite.background,
      sessionId: null,
      messages: [],
      coachTips: [],
      summary: null,
      suggestedAction: null,
      actionSaved: false,
      fromInvite: true,
      inviteSourceMessageId: practiceInvite.sourceMessageId,
    });
  }

  /**
   * Dismisses the practice invite without creating a draft.
   * The invite won't show again for this source message in this session.
   */
  function dismissPracticeInvite() {
    if (!practiceInvite) return;
    setDismissedInviteMessageIds((prev) => new Set([...prev, practiceInvite.sourceMessageId]));
    setPracticeInvite(null);
  }

  function updatePracticeDraft(field: "goal" | "background", value: string) {
    setPracticeChapter((current) => (current ? { ...current, [field]: value } : current));
  }

  function startPracticeChapter() {
    if (!practiceChapter) return;

    const goal = practiceChapter.goal.trim() || "把想说的话先演一遍";
    const background =
      practiceChapter.background.trim() || "用户想在现实中和 TA 练习一段更自然、更低压力的表达。";

    setChatNotice(null);
    setPracticeBusyLabel("正在把现实场景接进当前聊天...");
    startTransition(async () => {
      try {
        const data = await readApiResponse<{ sessionId: string; chapter?: { id: string } | null }>(
          await fetch("/api/practice/full-simulation/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scenarioType: "conversation",
              goal,
              background,
              triggerSource: practiceChapter.fromInvite ? "ta_invite" : "user_click",
              sourceMessageId: practiceChapter.inviteSourceMessageId ?? null,
            }),
          }),
          "演练没有开始，请稍后重试。",
        );
        setPracticeChapter((current) =>
          current
            ? {
                ...current,
                id: data.chapter?.id ?? current.id,
                status: "active",
                goal,
                background,
                sessionId: data.sessionId,
                messages: [],
                coachTips: [],
                summary: null,
                suggestedAction: null,
                actionSaved: false,
              }
            : current,
        );
      } catch (error) {
        setChatNotice({
          tone: "error",
          title: "演练还没开始",
          description: getClientErrorMessage(error, "演练没有开始，请稍后重试。"),
          retry: startPracticeChapter,
        });
      } finally {
        setPracticeBusyLabel(null);
      }
    });
  }

  function sendPracticeMessage(message: string) {
    const sessionId = practiceChapter?.sessionId;
    if (!sessionId) return;

    setText("");
    setChatNotice(null);
    setPracticeBusyLabel("现实中的 TA 正在回应...");
    startTransition(async () => {
      try {
        const data = await readApiResponse<{ crushReply: string; coachTip: CoachTip }>(
          await fetch("/api/practice/full-simulation/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, message }),
          }),
          "这句还没送进演练，请重试。",
        );
        setPracticeChapter((current) => {
          if (!current) return current;
          return {
            ...current,
            messages: [
              ...current.messages,
              { id: `practice-user-${Date.now()}`, role: "user", content: message },
              {
                id: `practice-crush-${Date.now()}`,
                role: "crush",
                content: data.crushReply,
                coachTip: data.coachTip,
              },
            ],
            coachTips: [...current.coachTips, data.coachTip],
          };
        });
      } catch (error) {
        setText(message);
        setChatNotice({
          tone: "error",
          title: "这句还没送进演练",
          description: getClientErrorMessage(error, "这句还没送进演练，请重试。"),
          retry: () => sendPracticeMessage(message),
        });
      } finally {
        setPracticeBusyLabel(null);
      }
    });
  }

  function finishPracticeChapter() {
    const sessionId = practiceChapter?.sessionId;
    if (!sessionId) return;

    setChatNotice(null);
    setPracticeBusyLabel("正在收束这段演练...");
    startTransition(async () => {
      try {
        const data = await readApiResponse<{
          summary?: PracticeSummary | null;
          suggestedAction?: SuggestedPracticeAction | null;
        }>(
          await fetch("/api/practice/full-simulation/finish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          }),
          "演练复盘没有生成，请稍后重试。",
        );
        const summary = data.summary ?? data.suggestedAction?.coachAnalysisJson ?? null;
        setRecentPracticeSummary(
          buildPracticeSummaryText(
            {
              ...practiceChapter,
              status: "finished",
              summary,
              suggestedAction: data.suggestedAction ?? null,
            },
            summary,
          ),
        );
        setPracticeChapter((current) => {
          if (!current) return current;
          return {
            ...current,
            status: "finished" as const,
            summary,
            suggestedAction: data.suggestedAction ?? null,
          };
        });
      } catch (error) {
        setChatNotice({
          tone: "error",
          title: "演练还没收束",
          description: getClientErrorMessage(error, "演练复盘没有生成，请稍后重试。"),
          retry: finishPracticeChapter,
        });
      } finally {
        setPracticeBusyLabel(null);
      }
    });
  }

  function retryLastPracticeLine() {
    const sessionId = practiceChapter?.sessionId;
    const lastUserMessage = practiceChapter?.messages.findLast((message) => message.role === "user");
    if (!sessionId || !lastUserMessage) return;

    setChatNotice(null);
    setPracticeBusyLabel("正在撤回上一轮演练...");
    startTransition(async () => {
      try {
        await readApiResponse(
          await fetch("/api/practice/full-simulation/retry-last", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          }),
          "上一句还没撤回，请稍后重试。",
        );
        setPracticeChapter((current) => {
          if (!current) return current;
          const lastUserIndex = current.messages.findLastIndex((message) => message.role === "user");
          return {
            ...current,
            messages: lastUserIndex >= 0 ? current.messages.slice(0, lastUserIndex) : current.messages,
            coachTips: current.coachTips.slice(0, Math.max(0, current.coachTips.length - 1)),
          };
        });
        setText(lastUserMessage.content);
      } catch (error) {
        setChatNotice({
          tone: "error",
          title: "上一句还没撤回",
          description: getClientErrorMessage(error, "上一句还没撤回，请稍后重试。"),
          retry: retryLastPracticeLine,
        });
      } finally {
        setPracticeBusyLabel(null);
      }
    });
  }

  function savePracticeAction() {
    const suggestedAction = practiceChapter?.suggestedAction;
    if (!suggestedAction) return;

    setChatNotice(null);
    setPracticeBusyLabel("正在生成现实行动...");
    startTransition(async () => {
      try {
        await readApiResponse(
          await fetch("/api/actions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              practiceRunId: suggestedAction.id,
              title: practiceChapter?.goal.trim() || "演练后的现实行动",
              suggestedMessage: suggestedAction.suggestedLine ?? null,
            }),
          }),
          "现实行动没有保存成功，请稍后重试。",
        );
        setPracticeChapter((current) => (current ? { ...current, actionSaved: true } : current));
        setChatNotice({
          tone: "success",
          title: "已生成现实行动",
          description: "这段演练已经收束成行动，你可以去行动页记录真实反馈。",
        });
      } catch (error) {
        setChatNotice({
          tone: "error",
          title: "现实行动还没生成",
          description: getClientErrorMessage(error, "现实行动没有保存成功，请稍后重试。"),
          retry: savePracticeAction,
        });
      } finally {
        setPracticeBusyLabel(null);
      }
    });
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceMessage("当前浏览器不支持录音，请直接输入文字。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      audioChunksRef.current = [];
      processor.onaudioprocess = (event) => {
        const channel = event.inputBuffer.getChannelData(0);
        audioChunksRef.current.push(new Float32Array(channel));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      audioSourceRef.current = source;
      processorRef.current = processor;
      setVoiceMessage("录音中，再点一次结束。");
      setVoiceState("recording");
    } catch {
      setVoiceMessage("无法访问麦克风，请检查浏览器权限。");
    }
  }

  async function stopRecording() {
    const audioContext = audioContextRef.current;
    const samples = mergeAudioChunks(audioChunksRef.current);

    processorRef.current?.disconnect();
    audioSourceRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

    processorRef.current = null;
    audioSourceRef.current = null;
    mediaStreamRef.current = null;
    audioChunksRef.current = [];

    if (audioContext) {
      await audioContext.close().catch(() => undefined);
    }
    audioContextRef.current = null;

    if (!audioContext || samples.length === 0) {
      setVoiceState("idle");
      setVoiceMessage("录音为空，请重试。");
      return;
    }

    setVoiceState("processing");
    setVoiceMessage("正在把语音转成文字...");

    try {
      const audioBlob = encodeWav(samples, audioContext.sampleRate);
      const formData = new FormData();
      formData.append("file", audioBlob, "voice-input.wav");

      const uploadData = await readApiResponse<{ temporaryObjectKey?: string }>(
        await fetch("/api/uploads/voice-input", {
          method: "POST",
          body: formData,
        }),
        "录音上传失败。",
      );

      if (!uploadData.temporaryObjectKey) {
        throw new Error("录音上传失败。");
      }

      const sttData = await readApiResponse<{ text?: string }>(
        await fetch("/api/voice/stt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioObjectKey: uploadData.temporaryObjectKey }),
        }),
        "语音转文字失败。",
      );

      if (!sttData.text) {
        throw new Error("语音转文字失败。");
      }

      const transcript = sttData.text;
      setText((current) => {
        const trimmedCurrent = current.trim();
        return trimmedCurrent ? `${trimmedCurrent} ${transcript}` : transcript;
      });
      setVoiceMessage("已转成文字，可修改后发送。");
    } catch (error) {
      setVoiceMessage(error instanceof Error ? error.message : "语音转文字失败，请重试。");
    } finally {
      setVoiceState("idle");
    }
  }

  function handleVoiceInput() {
    if (voiceState === "recording") {
      void stopRecording();
      return;
    }

    if (voiceState === "idle") {
      void startRecording();
    }
  }

  function favorite(message: Message) {
    setChatNotice(null);
    startTransition(async () => {
      try {
        await readApiResponse(
          await fetch("/api/memories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sourceType: "chat_favorite",
              sourceId: message.id,
              title: "收藏对白",
              excerpt: message.content,
              rewardJson: { virtualIntimacy: 5, memoryFragments: 1 },
              emotionTag: "intimate",
              importanceLevel: 2,
            }),
          }),
          "收藏失败，请稍后重试。",
        );
        setChatNotice({
          tone: "success",
          title: "已收藏为回忆",
          description: "这段对白已经放进轻量回忆册。",
        });
      } catch (error) {
        setChatNotice({
          tone: "error",
          title: "这条回忆还没收藏",
          description: getClientErrorMessage(error, "收藏失败，请稍后重试。"),
          retry: () => favorite(message),
        });
      }
    });
  }

  async function recordRealityEvent(message: Message) {
    if (recordedRealityMessageIds.has(message.id) || recordingRealityMessageId === message.id) {
      return;
    }

    setChatNotice(null);
    setRecordingRealityMessageId(message.id);
    try {
      await readApiResponse<{ realityEventId: string; realityEvent: RealityEvent }>(
        await fetch("/api/reality-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceMessageId: message.id }),
        }),
        "这件现实里的事还没记上，请稍后重试。",
      );
      setRecordedRealityMessageIds((current) => new Set([...current, message.id]));
      setChatNotice({
        tone: "success",
        title: "已记下现实事件",
        description: "之后演一遍时，会把这件现实里的事纳入参考。",
      });
    } catch (error) {
      setChatNotice({
        tone: "error",
        title: "还没记下来",
        description: getClientErrorMessage(error, "这件现实里的事还没记上，请稍后重试。"),
        retry: () => recordRealityEvent(message),
      });
    } finally {
      setRecordingRealityMessageId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col px-4 py-4 sm:px-6 lg:min-h-[calc(100vh-7rem)] pb-28 sm:pb-6 lg:pb-4">
      <div className="mb-4 flex items-center justify-between gap-4 rounded-[2rem] border border-white/70 bg-white/75 p-4 shadow-xl shadow-blush-100/60 backdrop-blur sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-900 font-display text-base font-semibold text-white shadow-lg shadow-blush-200 sm:h-12 sm:w-12 sm:text-lg">
            {(profile?.nickname ?? "TA").slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blush-700 sm:text-xs">TA</p>
            <h1 className="truncate font-display text-2xl font-semibold tracking-normal text-ink-900 sm:text-3xl">
              {headerTitle}
            </h1>
          </div>
        </div>
        <label className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-ink-700 sm:text-sm">
          <input
            checked={autoPlay}
            className="h-4 w-4 accent-blush-500"
            type="checkbox"
            onChange={(event) => setAutoPlay(event.target.checked)}
          />
          <span className="hidden sm:inline">语音自动播放</span>
          <span className="sm:hidden">语音</span>
        </label>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/65 p-3 shadow-2xl shadow-blush-200/40 backdrop-blur sm:gap-3 sm:p-4 lg:relative lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
        {chatNotice ? (
          <StatePanel
            tone={chatNotice.tone}
            title={chatNotice.title}
            description={chatNotice.description}
            actionLabel={chatNotice.retry ? "重试" : undefined}
            onAction={chatNotice.retry}
          />
        ) : null}
        <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 sm:space-y-3">
          {loadState === "loading" ? (
            <StatePanel tone="loading" title="正在加载聊天记录" description="把最近的陪伴消息整理出来。" />
          ) : loadState === "error" ? (
            <StatePanel
              tone="error"
              title="聊天记录暂时没加载出来"
              description={loadError ?? "聊天记录加载失败，请稍后重试。"}
              actionLabel="重新加载"
              onAction={retryLoadMessages}
            />
          ) : messages.length ? (
            messages.map((message, index) => {
              const canRecordReality =
                shouldSuggestRealityCapture(message) && !recordedRealityMessageIds.has(message.id);

              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-5 shadow-sm sm:max-w-[82%] sm:rounded-[1.5rem] sm:px-4 sm:py-3 sm:text-sm sm:leading-6 ${
                      message.role === "user"
                        ? "bg-ink-900 text-white"
                        : "border border-blush-100 bg-white text-ink-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    {message.role === "crush" ? (
                      <div className="mt-2.5 flex items-center gap-1.5 sm:mt-3 sm:gap-2">
                        {message.audioUrl ? (
                          <audio
                            ref={index === messages.length - 1 ? latestAudioRef : undefined}
                            src={message.audioUrl}
                          />
                        ) : null}
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blush-50 text-blush-700 sm:h-9 sm:w-9"
                          type="button"
                          onClick={() => {
                            if (message.audioUrl) {
                              const audio = new Audio(message.audioUrl);
                              audio.play().catch(() => undefined);
                              return;
                            }

                            synthesizeVoice(message);
                          }}
                          aria-label="播放语音"
                        >
                          <Play aria-hidden="true" size={14} className="sm:w-4 sm:h-4" />
                        </button>
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sun-100 text-ink-700 sm:h-9 sm:w-9"
                          type="button"
                          onClick={() => favorite(message)}
                          aria-label="收藏为回忆"
                        >
                          <Star aria-hidden="true" size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {/* System UI: Practice invite shown below TA's message when context warrants it */}
                  {practiceInvite && practiceInvite.sourceMessageId === message.id && message.role === "crush" ? (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-1.5 rounded-full border border-blush-200 bg-blush-50/80 px-2.5 py-1.5 text-xs font-bold text-blush-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blush-100 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs"
                        type="button"
                        onClick={acceptPracticeInvite}
                      >
                        <Sparkles aria-hidden="true" size={11} />
                        要不要先演一遍？
                      </button>
                      <button
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-400 transition hover:bg-ink-100 sm:h-6 sm:w-6"
                        type="button"
                        onClick={dismissPracticeInvite}
                        aria-label="关闭"
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                  {canRecordReality ? (
                    <button
                      className="mr-1 mt-1 inline-flex items-center rounded-full border border-blush-100 bg-white/80 px-2 py-0.5 text-[11px] font-black text-blush-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blush-50 disabled:opacity-60 sm:mr-1 sm:mt-1 sm:px-3 sm:py-1 sm:text-xs"
                      disabled={recordingRealityMessageId === message.id}
                      type="button"
                      onClick={() => recordRealityEvent(message)}
                    >
                      {recordingRealityMessageId === message.id ? "记录中..." : "记一下"}
                    </button>
                  ) : null}
                </div>
              );
            })
          ) : profile ? (
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-2xl border border-blush-100 bg-white px-3.5 py-2.5 text-sm leading-5 text-ink-900 shadow-sm sm:max-w-[82%] sm:rounded-[1.5rem] sm:px-4 sm:py-3 sm:text-sm sm:leading-6">
                <p>你来了。</p>
                <p className="mt-1">今天想先和我说什么？</p>
              </div>
            </div>
          ) : (
            <StatePanel tone="empty" title="还没有 TA" description="先完成建档，之后这里会直接变成你和 TA 的聊天主场。">
              <Link
                className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-ink-900 px-4 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blush-700"
                href="/onboarding/create"
              >
                创建 TA 档案
              </Link>
            </StatePanel>
          )}

          {practiceChapter ? (
            <PracticeChapterPanel
              chapter={practiceChapter}
              profileName={profile?.nickname ?? "TA"}
              busyLabel={practiceBusyLabel}
              isPending={isPending}
              onCancel={() => setPracticeChapter(null)}
              onFinish={finishPracticeChapter}
              onRetryLast={retryLastPracticeLine}
              onReset={() => setPracticeChapter(createPracticeChapter())}
              onSaveAction={savePracticeAction}
              onStart={startPracticeChapter}
              onUpdateDraft={updatePracticeDraft}
            />
          ) : null}
        </div>

        {/* Sticky input area for mobile - visible above bottom nav */}
        <div className="sticky bottom-0 -mx-3 -mb-3 rounded-b-[1.75rem] border-t border-blush-100 bg-white/95 p-3 backdrop-blur sm:-mx-4 sm:-mb-4 sm:rounded-b-[2rem] sm:p-4 lg:relative lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="flex items-center gap-2">
            <button
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-ink-900/10 bg-white px-3 text-xs font-bold text-ink-900 transition hover:bg-blush-50 disabled:opacity-50 sm:px-4 sm:text-sm"
              disabled={loadState !== "ready" || !profile || isPracticeActive || isPracticeDraft}
              type="button"
              onClick={openPracticeChapter}
            >
              {isPracticeActive ? "演练中" : "演一遍"}
            </button>
            <button
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition sm:h-12 sm:w-12 ${
                voiceState === "recording"
                  ? "animate-pulse bg-blush-500 text-white"
                  : "bg-mint-100 text-mint-500"
              }`}
              disabled={isPending || voiceState === "processing" || composerDisabled}
              type="button"
              onClick={handleVoiceInput}
              aria-label={voiceState === "recording" ? "停止录音" : "语音输入"}
            >
              <Mic aria-hidden="true" size={18} />
            </button>
            <input
              className="min-w-0 flex-1 rounded-full border border-blush-100 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-blush-500 disabled:text-ink-500 sm:px-4 sm:py-3 sm:text-base"
              placeholder={composerPlaceholder}
              disabled={composerDisabled}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  send(text);
                }
              }}
            />
            <button
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white disabled:opacity-50 sm:h-12 sm:w-12"
              disabled={isPending || voiceState !== "idle" || composerDisabled}
              type="button"
              onClick={() => send(text)}
              aria-label="发送"
            >
              <Send aria-hidden="true" size={18} />
            </button>
          </div>
          {voiceMessage ? <p className="mt-1.5 px-2 text-xs font-bold text-ink-600 lg:hidden">{voiceMessage}</p> : null}
        </div>
      </div>
    </div>
  );
}

function PracticeChapterPanel({
  chapter,
  profileName,
  busyLabel,
  isPending,
  onCancel,
  onFinish,
  onRetryLast,
  onReset,
  onSaveAction,
  onStart,
  onUpdateDraft,
}: {
  chapter: PracticeChapter;
  profileName: string;
  busyLabel: string | null;
  isPending: boolean;
  onCancel: () => void;
  onFinish: () => void;
  onRetryLast: () => void;
  onReset: () => void;
  onSaveAction: () => void;
  onStart: () => void;
  onUpdateDraft: (field: "goal" | "background", value: string) => void;
}) {
  return (
    <div className="my-2 overflow-hidden rounded-2xl border border-ink-900/10 bg-ink-900 text-white shadow-xl shadow-ink-900/10 sm:my-2 sm:rounded-[1.75rem]">
      <div className="border-b border-white/10 bg-white/5 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blush-200 sm:text-xs">演练章节</p>
            <h2 className="mt-0.5 text-base font-semibold tracking-normal text-white sm:mt-1 sm:text-xl">
              现实中的 {profileName}
            </h2>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/80 sm:px-3 sm:py-1 sm:text-xs">
            {chapter.status === "draft" ? "准备中" : chapter.status === "active" ? "进行中" : "已结束"}
          </span>
        </div>
      </div>

      {busyLabel ? (
        <div className="px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-xs font-bold text-white/85 sm:rounded-3xl sm:p-4 sm:text-sm">
            {busyLabel}
          </div>
        </div>
      ) : null}

      {chapter.status === "draft" ? (
        <div className="grid gap-3 p-3 sm:gap-4 sm:p-4">
          <div className="rounded-2xl bg-white p-3 text-xs leading-6 text-ink-800 sm:rounded-3xl sm:p-4 sm:text-sm">
            <p className="font-black text-ink-900">这段不会跳到另一个页面。</p>
            <p className="mt-1">先告诉我想演什么，然后用下面的输入框开始说。</p>
          </div>
          <label className="grid gap-1.5 text-xs font-bold text-white/85 sm:gap-2 sm:text-sm">
            这次想演什么？
            <textarea
              className="min-h-20 rounded-2xl border border-white/15 bg-white px-3 py-2.5 text-sm font-semibold leading-6 text-ink-900 outline-none focus:border-blush-300 sm:min-h-24 sm:rounded-3xl sm:px-4 sm:py-3 sm:text-base"
              placeholder="比如：想约 TA 周末见面，但怕太突然。"
              value={chapter.goal}
              onChange={(event) => onUpdateDraft("goal", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-white/85 sm:gap-2 sm:text-sm">
            现实背景（可选）
            <textarea
              className="min-h-16 rounded-2xl border border-white/15 bg-white px-3 py-2 text-xs font-semibold leading-6 text-ink-900 outline-none focus:border-blush-300 sm:min-h-20 sm:rounded-3xl sm:px-4 sm:py-3 sm:text-sm"
              placeholder="比如：最近聊过一家店，TA 回复不算冷淡。"
              value={chapter.background}
              onChange={(event) => onUpdateDraft("background", event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-blush-500 px-4 font-black text-white transition hover:bg-blush-600 disabled:opacity-60 sm:min-h-11 sm:gap-2 sm:px-5"
              disabled={isPending}
              type="button"
              onClick={onStart}
            >
              <Sparkles aria-hidden="true" size={14} />
              开始演练
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-white/10 px-4 font-bold text-white transition hover:bg-white/15 sm:min-h-11 sm:px-5"
              type="button"
              onClick={onCancel}
            >
              先不演了
            </button>
          </div>
        </div>
      ) : null}

      {chapter.status === "active" ? (
        <div className="grid gap-3 p-3 sm:gap-4 sm:p-4">
          <div className="rounded-2xl bg-white/10 p-3 text-xs leading-6 text-white/80 sm:rounded-3xl sm:p-4 sm:text-sm">
            <p className="font-black text-white">{chapter.goal}</p>
            <p className="mt-1">现在更像现实里的 TA，不会自动给提示。你先说。</p>
          </div>
          <div className="grid gap-2.5 sm:gap-3">
            {chapter.messages.length ? (
              chapter.messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[90%] rounded-xl px-3 py-2.5 text-xs leading-5 sm:max-w-[84%] sm:rounded-[1.4rem] sm:px-4 sm:py-3 sm:text-sm sm:leading-6 ${
                      message.role === "user" ? "bg-white text-ink-900" : "bg-blush-50 text-ink-900"
                    }`}
                  >
                    <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-ink-500 sm:mb-1 sm:text-[11px]">
                      {message.role === "user" ? "你" : `${profileName}`}
                    </p>
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    {message.coachTip?.advice ? (
                      <details className="mt-2 rounded-xl bg-white/70 px-2.5 py-2 text-xs leading-5 text-ink-700 sm:mt-3 sm:rounded-2xl sm:px-3 sm:py-2">
                        <summary className="cursor-pointer font-black text-ink-900">提示一下</summary>
                        <p className="mt-1">{message.coachTip.advice}</p>
                        {message.coachTip.nextMove ? <p className="mt-1">下一步：{message.coachTip.nextMove}</p> : null}
                      </details>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-xl bg-blush-50 px-3 py-2.5 text-xs leading-5 text-ink-900 sm:max-w-[84%] sm:rounded-[1.4rem] sm:px-4 sm:py-3 sm:text-sm sm:leading-6">
                  <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-ink-500 sm:mb-1 sm:text-[11px]">
                    {profileName}
                  </p>
                  <p>好，那就当现在是在现实里。你先说。</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 sm:pt-4">
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-white/10 px-3 text-xs font-bold text-white transition hover:bg-white/15 disabled:opacity-60 sm:min-h-11 sm:px-5 sm:text-sm"
              disabled={isPending || !chapter.messages.some((message) => message.role === "user")}
              type="button"
              onClick={onRetryLast}
            >
              重来这句
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-3 text-xs font-black text-ink-900 transition hover:bg-blush-50 disabled:opacity-60 sm:min-h-11 sm:px-5 sm:text-sm"
              disabled={isPending || !chapter.messages.length}
              type="button"
              onClick={onFinish}
            >
              结束演练
            </button>
            <p className="w-full text-[10px] font-bold text-white/55 sm:w-auto sm:text-xs">提示默认收起，点开才出现。</p>
          </div>
        </div>
      ) : null}

      {chapter.status === "finished" ? (
        <div className="grid gap-3 p-3 sm:gap-4 sm:p-4">
          <div className="rounded-2xl bg-white p-3 text-xs leading-6 text-ink-800 sm:rounded-3xl sm:p-4 sm:text-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blush-700 sm:text-xs">这轮试下来</p>
            <p className="mt-1.5 font-black text-ink-900 sm:mt-2">
              {chapter.summary?.summary ?? "你已经完成了一轮现实表达预演。"}
            </p>
            {chapter.summary?.mainRisk ? (
              <p className="mt-2 rounded-xl bg-rose-50 p-2.5 font-bold text-rose-700 sm:mt-3 sm:rounded-2xl sm:p-3">
                主要风险：{chapter.summary.mainRisk}
              </p>
            ) : null}
            {chapter.summary?.saferAlternative ? (
              <p className="mt-2 rounded-xl bg-mint-100/60 p-2.5 font-bold text-ink-800 sm:mt-3 sm:rounded-2xl sm:p-3">
                更稳方向：{chapter.summary.saferAlternative}
              </p>
            ) : null}
            {chapter.summary?.riskPoints?.length ? (
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4 sm:mt-2">
                {chapter.summary.riskPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            ) : null}
            {chapter.suggestedAction?.suggestedLine ? (
              <div className="mt-2 rounded-xl bg-blush-50 p-2.5 font-bold text-ink-900 sm:mt-3 sm:rounded-2xl sm:p-3">
                更稳一点：{chapter.suggestedAction.suggestedLine}
              </div>
            ) : null}
            {chapter.summary?.recommendedNextAction ? (
              <p className="mt-1.5 text-xs sm:mt-3 sm:text-sm">下一步：{chapter.summary.recommendedNextAction}</p>
            ) : null}
          </div>
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-xl bg-blush-50 px-3 py-2.5 text-xs leading-5 text-ink-900 sm:max-w-[84%] sm:rounded-[1.4rem] sm:px-4 sm:py-3 sm:text-sm sm:leading-6">
              <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-ink-500 sm:mb-1 sm:text-[11px]">{profileName}</p>
              <p>刚才这段我知道了。先回到平时聊天，不用马上逼自己。</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-white px-3 font-black text-ink-900 transition hover:bg-blush-50 disabled:opacity-60 sm:min-h-11 sm:gap-2 sm:px-5 sm:text-sm"
              disabled={isPending || !chapter.suggestedAction || chapter.actionSaved}
              type="button"
              onClick={onSaveAction}
            >
              <Save aria-hidden="true" size={14} />
              {chapter.actionSaved ? "已生成行动" : "生成行动"}
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-white/10 px-3 font-bold text-white transition hover:bg-white/15 sm:min-h-11 sm:px-5 sm:text-sm"
              type="button"
              onClick={onReset}
            >
              再演一遍
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-white/10 px-3 font-bold text-white transition hover:bg-white/15 sm:min-h-11 sm:px-5 sm:text-sm"
              type="button"
              onClick={onCancel}
            >
              收起
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
