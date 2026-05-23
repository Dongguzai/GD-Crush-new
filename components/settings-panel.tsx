"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Volume2, Play, User, LogOut } from "lucide-react";

type VoiceSettings = {
  autoPlayCompanionVoice: boolean;
  voiceSpeed: "slow" | "normal" | "fast";
  voiceEmotionLevel: "restrained" | "natural" | "sweet";
  voiceAgeStyle: "young" | "mature";
};

const voiceSpeedOptions = [
  { value: "slow", label: "慢一点" },
  { value: "normal", label: "标准" },
  { value: "fast", label: "快一点" },
] as const;

const voiceEmotionOptions = [
  { value: "restrained", label: "克制" },
  { value: "natural", label: "自然" },
  { value: "sweet", label: "甜蜜" },
] as const;

const voiceAgeOptions = [
  { value: "young", label: "年轻" },
  { value: "mature", label: "成熟" },
] as const;

export function SettingsPanel() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<VoiceSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [previewText, setPreviewText] = useState("你好呀，今天想和你聊聊天。");

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/user-settings");
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    }
    loadSettings();
  }, []);

  // Load auth status on mount
  useEffect(() => {
    async function loadAuthStatus() {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(data.isAuthenticated);
          setUserEmail(data.email);
        }
      } catch (error) {
        console.error("Failed to load auth status:", error);
      } finally {
        setAuthLoading(false);
      }
    }
    loadAuthStatus();
  }, []);

  // Logout handler
  function handleLogout() {
    startTransition(async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
        setIsAuthenticated(false);
        setUserEmail(null);
        router.push("/app/auth");
      } catch (error) {
        console.error("Logout failed:", error);
      }
    });
  }

  function updateSetting<K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) {
    if (!settings) return;

    startTransition(async () => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);

      const response = await fetch("/api/user-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        setSettings(settings); // Revert on failure
      }
    });
  }

  function destroy() {
    startTransition(async () => {
      const response = await fetch("/api/crush/destroy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText }),
      });
      const payload = await response.json().catch(() => null);
      setMessage(
        response.ok
          ? "Crush 数据已粉碎。回到聊天页后会进入未建档状态。"
          : payload?.message ?? payload?.error ?? "粉碎失败，请稍后重试。",
      );
    });
  }

  function playPreview() {
    if (!settings) return;
    startTransition(async () => {
      await fetch("/api/voice/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: previewText,
          speed: settings.voiceSpeed,
          emotionLevel: settings.voiceEmotionLevel,
          ageStyle: settings.voiceAgeStyle,
        }),
      });
    });
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-6 sm:px-8 lg:py-10">
      {/* Account Section */}
      <section className="mb-6 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-blush-200/40 backdrop-blur">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blush-100">
            <User aria-hidden="true" size={20} className="text-blush-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-blush-700">账号</p>
            <h2 className="font-display text-2xl font-semibold tracking-normal text-ink-900">账户管理</h2>
          </div>
        </div>

        {authLoading ? (
          <div className="animate-pulse h-12 rounded-2xl bg-blush-50" />
        ) : isAuthenticated ? (
          <div className="flex items-center justify-between rounded-2xl bg-mint-50 p-4">
            <div>
              <p className="font-bold text-ink-900">已登录</p>
              <p className="text-sm text-ink-600">{userEmail}</p>
              <p className="mt-1 text-xs text-ink-400">你的数据已同步到云端</p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-blush-200 bg-white px-4 py-2 text-sm font-bold text-blush-700 transition hover:bg-blush-50"
              onClick={handleLogout}
              disabled={isPending}
            >
              <LogOut size={16} />
              退出登录
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-2xl bg-blush-50 p-4">
            <div>
              <p className="font-bold text-ink-900">游客模式</p>
              <p className="text-sm text-ink-600">创建账号以保存跨设备数据</p>
            </div>
            <Link
              href="/app/auth"
              className="inline-flex items-center gap-2 rounded-full bg-blush-500 px-5 py-2.5 font-bold text-white transition hover:bg-blush-600"
            >
              创建账号
            </Link>
          </div>
        )}
      </section>

      {/* Voice Settings Section */}
      <section className="mb-6 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-blush-200/40 backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blush-100">
            <Volume2 aria-hidden="true" size={20} className="text-blush-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-blush-700">语音设置</p>
            <h2 className="font-display text-2xl font-semibold tracking-normal text-ink-900">TA 的声音</h2>
          </div>
        </div>

        {isLoadingSettings ? (
          <div className="animate-pulse space-y-4">
            <div className="h-12 rounded-2xl bg-blush-50" />
            <div className="h-12 rounded-2xl bg-blush-50" />
            <div className="h-12 rounded-2xl bg-blush-50" />
          </div>
        ) : settings ? (
          <div className="space-y-6">
            {/* Auto Play Toggle */}
            <div className="flex items-center justify-between rounded-2xl bg-blush-50 p-4">
              <div>
                <p className="font-bold text-ink-900">自动播放语音</p>
                <p className="text-sm text-ink-600">Crush 回复时自动播放语音</p>
              </div>
              <button
                className={`relative h-8 w-14 rounded-full transition-colors ${
                  settings.autoPlayCompanionVoice ? "bg-blush-500" : "bg-ink-200"
                }`}
                onClick={() => updateSetting("autoPlayCompanionVoice", !settings.autoPlayCompanionVoice)}
                aria-label={settings.autoPlayCompanionVoice ? "关闭自动播放" : "开启自动播放"}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                    settings.autoPlayCompanionVoice ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Voice Speed */}
            <div className="space-y-2">
              <p className="font-bold text-ink-900">语速</p>
              <div className="grid grid-cols-3 gap-2">
                {voiceSpeedOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`rounded-2xl border-2 py-3 text-sm font-bold transition-colors ${
                      settings.voiceSpeed === option.value
                        ? "border-blush-500 bg-blush-50 text-blush-700"
                        : "border-blush-100 bg-white text-ink-700 hover:border-blush-300"
                    }`}
                    onClick={() => updateSetting("voiceSpeed", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Emotion */}
            <div className="space-y-2">
              <p className="font-bold text-ink-900">情绪风格</p>
              <div className="grid grid-cols-3 gap-2">
                {voiceEmotionOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`rounded-2xl border-2 py-3 text-sm font-bold transition-colors ${
                      settings.voiceEmotionLevel === option.value
                        ? "border-blush-500 bg-blush-50 text-blush-700"
                        : "border-blush-100 bg-white text-ink-700 hover:border-blush-300"
                    }`}
                    onClick={() => updateSetting("voiceEmotionLevel", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Age */}
            <div className="space-y-2">
              <p className="font-bold text-ink-900">声音年龄感</p>
              <div className="grid grid-cols-2 gap-2">
                {voiceAgeOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`rounded-2xl border-2 py-3 text-sm font-bold transition-colors ${
                      settings.voiceAgeStyle === option.value
                        ? "border-blush-500 bg-blush-50 text-blush-700"
                        : "border-blush-100 bg-white text-ink-700 hover:border-blush-300"
                    }`}
                    onClick={() => updateSetting("voiceAgeStyle", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <p className="font-bold text-ink-900">预览效果</p>
              <div className="flex gap-2">
                <input
                  className="min-h-12 flex-1 rounded-full border border-blush-100 bg-white px-4 text-sm font-semibold outline-none focus:border-blush-500"
                  placeholder="输入预览文本..."
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                />
                <button
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blush-500 text-white transition-colors hover:bg-blush-600 disabled:opacity-50"
                  onClick={playPreview}
                  aria-label="播放预览"
                >
                  <Play aria-hidden="true" size={20} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-ink-600">无法加载语音设置</p>
        )}
      </section>

      {/* Privacy Section */}
      <section className="mb-6 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-blush-200/40 backdrop-blur">
        <p className="text-sm font-bold text-blush-700">隐私与安全</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-normal text-ink-900">
          默认保护原始材料，保留可控的虚拟资产。
        </h2>
        <div className="mt-6 grid gap-3 text-sm leading-7 text-ink-700">
          <p className="rounded-3xl bg-mint-100/55 p-4">图片参考只用于本次生成；确认删除成功后，系统才会标记为已删除。</p>
          <p className="rounded-3xl bg-mint-100/55 p-4">语音输入只用于即时转写，临时录音会在识别结束后删除，不作为长期素材保留。</p>
          <p className="rounded-3xl bg-mint-100/55 p-4">生成后的二次元角色资产和合成语音会保留，直到你手动粉碎当前 Crush 时一并删除。</p>
          <p className="rounded-3xl bg-mint-100/55 p-4">语音使用产品内合成声线，不做真实人物声音克隆。</p>
          <p className="rounded-3xl bg-mint-100/55 p-4">聊天文本只提取摘要标签，推测必须由用户确认后才入档。</p>
        </div>
      </section>

      {/* Destroy Section */}
      <section className="rounded-[2rem] border border-blush-200 bg-blush-50 p-6 shadow-xl shadow-blush-200/40">
        <h2 className="flex items-center gap-2 text-lg font-black text-ink-900">
          <Trash2 aria-hidden="true" size={20} />
          一键粉碎 Crush 数据
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-700">
          输入 DELETE 进行二次确认。该操作会永久删除当前 Crush 的聊天、情报、行动、回忆和已生成素材。
        </p>
        <div className="mt-4 flex gap-2">
          <input
            className="min-h-12 flex-1 rounded-full border border-blush-200 bg-white px-4 font-bold outline-none focus:border-blush-500"
            placeholder="DELETE"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
          />
          <button
            className="rounded-full bg-ink-900 px-5 font-bold text-white disabled:opacity-60"
            disabled={isPending || confirmText !== "DELETE"}
            type="button"
            onClick={destroy}
          >
            粉碎
          </button>
        </div>
        {message ? <p className="mt-3 text-sm font-bold text-blush-700">{message}</p> : null}
      </section>
    </main>
  );
}
