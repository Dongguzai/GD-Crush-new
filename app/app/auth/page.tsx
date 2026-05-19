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
    <div className="min-h-screen bg-gradient-to-b from-blush-50 to-white">
      {/* Header */}
      <header className="p-4">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink-700 shadow-sm transition hover:bg-blush-50"
        >
          <ArrowLeft size={16} />
          返回聊天
        </Link>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-md px-5 py-12">
        <div className="rounded-[2rem] border border-white/70 bg-white/75 p-8 shadow-2xl shadow-blush-200/40 backdrop-blur">
          {/* Logo/Title */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ink-900 text-white">
              <User size={32} />
            </div>
            <h1 className="font-display text-3xl font-semibold text-ink-900">
              {mode === "login" ? "欢迎回来" : "创建账号"}
            </h1>
            <p className="mt-2 text-sm text-ink-600">
              {mode === "login"
                ? "登录以保存跨设备数据"
                : "注册后可跨设备同步你的数据"}
            </p>
          </div>

          {/* Success Message */}
          {success ? (
            <div className="rounded-2xl bg-mint-100 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-mint-500 text-white">
                <Check size={24} />
              </div>
              <p className="font-bold text-ink-900">
                {mode === "register" ? "账号创建成功！" : "登录成功！"}
              </p>
              <p className="mt-1 text-sm text-ink-600">正在跳转到聊天...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-ink-700">
                  <Mail size={16} />
                  邮箱
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="min-h-12 w-full rounded-full border border-blush-100 bg-white px-4 text-base outline-none focus:border-blush-500"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-ink-700">
                  <Lock size={16} />
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "至少 8 个字符" : "输入密码"}
                  required
                  minLength={mode === "register" ? 8 : 1}
                  className="min-h-12 w-full rounded-full border border-blush-100 bg-white px-4 text-base outline-none focus:border-blush-500"
                />
              </div>

              {/* Confirm Password (register only) */}
              {mode === "register" && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-ink-700">
                    <Lock size={16} />
                    确认密码
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
                    required
                    minLength={8}
                    className="min-h-12 w-full rounded-full border border-blush-100 bg-white px-4 text-base outline-none focus:border-blush-500"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="min-h-12 w-full rounded-full bg-ink-900 font-bold text-white transition hover:bg-blush-700 disabled:opacity-50"
              >
                {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
              </button>

              {/* Toggle Mode */}
              <p className="text-center text-sm text-ink-600">
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
          <div className="mt-6 border-t border-blush-100 pt-6">
            <Link
              href="/app"
              className="block text-center text-sm text-ink-500 hover:text-blush-600"
            >
              稍后再说，先去聊天
            </Link>
          </div>
        </div>

        {/* Privacy Note */}
        <p className="mt-6 text-center text-xs text-ink-400">
          继续使用即表示你同意我们的隐私政策。
          我们不会分享你的个人信息。
        </p>
      </main>
    </div>
  );
}
