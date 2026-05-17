"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Mic, Play, Send, Star } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "crush" | "coach" | "system";
  content: string;
  audioUrl?: string | null;
};

type VoiceState = "idle" | "recording" | "processing";

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

export function CompanionChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [autoPlay, setAutoPlay] = useState(true);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const latestAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);

  useEffect(() => {
    fetch("/api/chat/companion")
      .then((response) => response.json() as Promise<{ messages: Message[] }>)
      .then((data) => setMessages(data.messages ?? []));
  }, []);

  useEffect(() => {
    return () => {
      processorRef.current?.disconnect();
      audioSourceRef.current?.disconnect();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close().catch(() => undefined);
    };
  }, []);

  function send(message: string, inputMode: "text" | "voice" = "text") {
    if (!message.trim()) {
      return;
    }
    setText("");
    startTransition(async () => {
      const response = await fetch("/api/chat/companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, inputMode }),
      });
      const data = (await response.json()) as { userMessage: Message; crushMessage: Message };
      let crushMessage = data.crushMessage;

      const voice = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: crushMessage.id, text: crushMessage.content }),
      }).then((voiceResponse) => voiceResponse.json() as Promise<{ audioUrl: string }>);
      crushMessage = { ...crushMessage, audioUrl: voice.audioUrl };
      setMessages((current) => [...current, data.userMessage, crushMessage]);

      if (autoPlay) {
        setTimeout(() => {
          latestAudioRef.current?.play().catch(() => undefined);
        }, 80);
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

      const uploadResponse = await fetch("/api/uploads/voice-input", {
        method: "POST",
        body: formData,
      });
      const uploadData = (await uploadResponse.json()) as {
        temporaryObjectKey?: string;
        message?: string;
      };

      if (!uploadResponse.ok || !uploadData.temporaryObjectKey) {
        throw new Error(uploadData.message ?? "录音上传失败。");
      }

      const sttResponse = await fetch("/api/voice/stt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioObjectKey: uploadData.temporaryObjectKey }),
      });
      const sttData = (await sttResponse.json()) as {
        text?: string;
        message?: string;
      };

      if (!sttResponse.ok || !sttData.text) {
        throw new Error(sttData.message ?? "语音转文字失败。");
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
    startTransition(async () => {
      await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "chat_favorite",
          sourceId: message.id,
          title: "收藏对白",
          excerpt: message.content,
          rewardJson: { virtualIntimacy: 5, memoryFragments: 1 },
        }),
      });
    });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-4xl flex-col px-5 py-6 sm:px-8">
      <div className="mb-4 rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-blush-100/60 backdrop-blur">
        <p className="text-sm font-bold text-blush-700">甜蜜陪伴模式</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-normal text-ink-900">
          只显示虚拟 Crush，教练暂时退场。
        </h1>
        <label className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-ink-700">
          <input
            checked={autoPlay}
            className="h-4 w-4 accent-blush-500"
            type="checkbox"
            onChange={(event) => setAutoPlay(event.target.checked)}
          />
          Crush 语音回复自动播放
        </label>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-hidden rounded-[2rem] border border-white/70 bg-white/65 p-4 shadow-2xl shadow-blush-200/40 backdrop-blur">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length ? (
            messages.map((message, index) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-[1.5rem] px-4 py-3 text-sm leading-6 shadow-sm ${
                    message.role === "user"
                      ? "bg-ink-900 text-white"
                      : "border border-blush-100 bg-white text-ink-900"
                  }`}
                >
                  <p>{message.content}</p>
                  {message.role === "crush" ? (
                    <div className="mt-3 flex items-center gap-2">
                      {message.audioUrl ? (
                        <audio
                          ref={index === messages.length - 1 ? latestAudioRef : undefined}
                          src={message.audioUrl}
                        />
                      ) : null}
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blush-50 text-blush-700"
                        type="button"
                        onClick={() => {
                          const audio = new Audio(message.audioUrl ?? "/api/voice/mock");
                          audio.play().catch(() => undefined);
                        }}
                        aria-label="播放语音"
                      >
                        <Play aria-hidden="true" size={15} />
                      </button>
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sun-100 text-ink-700"
                        type="button"
                        onClick={() => favorite(message)}
                        aria-label="收藏为回忆"
                      >
                        <Star aria-hidden="true" size={15} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl bg-blush-50/70 p-5 text-sm leading-7 text-ink-700">
              还没有聊天。试着说一句「今天有点想你」，系统会为 Crush 生成语音回复。
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-blush-100 pt-3">
          <button
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition ${
              voiceState === "recording"
                ? "animate-pulse bg-blush-500 text-white"
                : "bg-mint-100 text-mint-500"
            }`}
            disabled={isPending || voiceState === "processing"}
            type="button"
            onClick={handleVoiceInput}
            aria-label={voiceState === "recording" ? "停止录音" : "语音输入"}
          >
            <Mic aria-hidden="true" size={20} />
          </button>
          <input
            className="min-w-0 flex-1 rounded-full border border-blush-100 bg-white px-4 text-base font-semibold outline-none focus:border-blush-500"
            placeholder="输入一句想说的话..."
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                send(text);
              }
            }}
          />
          <button
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white disabled:opacity-50"
            disabled={isPending || voiceState !== "idle"}
            type="button"
            onClick={() => send(text)}
            aria-label="发送"
          >
            <Send aria-hidden="true" size={20} />
          </button>
        </div>
        {voiceMessage ? <p className="px-2 text-xs font-bold text-ink-600">{voiceMessage}</p> : null}
      </div>
    </div>
  );
}
