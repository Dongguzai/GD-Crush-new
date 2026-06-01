"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, ArrowLeft, Check } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.isAuthenticated) {
          router.push("/app");
        }
      } catch {
        // Continue to auth page
      }
    }
    checkAuth();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate passwords match for register
      if (mode === "register" && password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body = mode === "register"
        ? { email, password }
        : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Authentication failed");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/app");
      }, 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blush-50 to-white pb-safe" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 p-4 backdrop-blur">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-bold text-ink-700 shadow-sm transition hover:bg-blush-50 sm:px-4 sm:py-2.5"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">返回聊天</span>
          <span className="sm:hidden">返回</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-md px-4 py-8 sm:px-5 sm:py-12">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-blush-200/40 backdrop-blur sm:rounded-[2rem] sm:p-8">
          {/* Logo/Title */}
          <div className="mb-6 text-center sm:mb-8">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-ink-900 text-white sm:mb-4 sm:h-16 sm:w-16">
              <User size={28} className="sm:size-8" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              {mode === "login" ? "欢迎回来" : "创建账号"}
            </h1>
            <p className="mt-1.5 text-xs text-ink-600 sm:mt-2 sm:text-sm">
              {mode === "login"
                ? "登录以保存跨设备数据"
                : "注册后可跨设备同步你的数据"}
            </p>
          </div>

          {/* Success Message */}
          {success ? (
            <div className="rounded-2xl bg-mint-100 p-5 text-center sm:p-6">
              <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-mint-500 text-white sm:mb-3 sm:h-12 sm:w-12">
                <Check size={22} />
              </div>
              <p className="font-bold text-ink-900">
                {mode === "register" ? "账号创建成功！" : "登录成功！"}
              </p>
              <p className="mt-1 text-xs text-ink-600 sm:text-sm">正在跳转到聊天...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {/* Error Message */}
              {error && (
                <div className="rounded-2xl bg-red-50 p-3.5 text-xs text-red-600 sm:p-4 sm:text-sm">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-ink-700 sm:gap-2 sm:text-sm">
                  <Mail size={14} className="sm:size-4" />
                  邮箱
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="min-h-11 w-full rounded-full border border-blush-100 bg-white px-4 text-sm outline-none transition focus:border-blush-500 sm:min-h-12 sm:text-base"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-ink-700 sm:gap-2 sm:text-sm">
                  <Lock size={14} className="sm:size-4" />
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "至少 8 个字符" : "输入密码"}
                  required
                  minLength={mode === "register" ? 8 : 1}
                  className="min-h-11 w-full rounded-full border border-blush-100 bg-white px-4 text-sm outline-none transition focus:border-blush-500 sm:min-h-12 sm:text-base"
                />
              </div>

              {/* Confirm Password (register only) */}
              {mode === "register" && (
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-ink-700 sm:gap-2 sm:text-sm">
                    <Lock size={14} className="sm:size-4" />
                    确认密码
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
                    required
                    minLength={8}
                    className="min-h-11 w-full rounded-full border border-blush-100 bg-white px-4 text-sm outline-none transition focus:border-blush-500 sm:min-h-12 sm:text-base"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="min-h-11 w-full rounded-full bg-ink-900 text-sm font-bold text-white transition hover:bg-blush-700 disabled:opacity-50 sm:min-h-12 sm:text-base"
              >
                {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
              </button>

              {/* Toggle Mode */}
              <p className="text-center text-xs text-ink-600 sm:text-sm">
                {mode === "login" ? "还没有账号？" : "已有账号？"}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setError(null);
                  }}
                  className="ml-1 font-bold text-blush-600 hover:underline"
                >
                  {mode === "login" ? "立即注册" : "立即登录"}
                </button>
              </p>
            </form>
          )}

          {/* Continue as Guest */}
          <div className="mt-5 border-t border-blush-100 pt-5 sm:mt-6 sm:pt-6">
            <Link
              href="/app"
              className="block text-center text-xs text-ink-500 hover:text-blush-600 sm:text-sm"
            >
              稍后再说，先去聊天
            </Link>
          </div>
        </div>

        {/* Privacy Note */}
        <p className="mt-5 text-center text-[10px] text-ink-400 sm:mt-6 sm:text-xs">
          继续使用即表示你同意我们的隐私政策。
          我们不会分享你的个人信息。
        </p>
      </main>
    </div>
  );
}