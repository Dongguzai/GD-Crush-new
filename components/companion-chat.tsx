"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Mic, Play, Send, Star } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "crush" | "coach" | "system";
  content: string;
  audioUrl?: string | null;
};

export function CompanionChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [autoPlay, setAutoPlay] = useState(true);
  const [isPending, startTransition] = useTransition();
  const latestAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch("/api/chat/companion")
      .then((response) => response.json() as Promise<{ messages: Message[] }>)
      .then((data) => setMessages(data.messages ?? []));
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

  function mockVoiceInput() {
    startTransition(async () => {
      const response = await fetch("/api/voice/stt", { method: "POST" });
      const data = (await response.json()) as { text: string };
      send(data.text, "voice");
    });
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
              还没有聊天。试着说一句「今天有点想你」，系统会用 mock TTS 生成语音回复。
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-blush-100 pt-3">
          <button
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mint-100 text-mint-500"
            disabled={isPending}
            type="button"
            onClick={mockVoiceInput}
            aria-label="语音输入"
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
            disabled={isPending}
            type="button"
            onClick={() => send(text)}
            aria-label="发送"
          >
            <Send aria-hidden="true" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
