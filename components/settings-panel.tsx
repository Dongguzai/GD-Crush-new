"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

export function SettingsPanel() {
  const [confirmText, setConfirmText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function destroy() {
    startTransition(async () => {
      const response = await fetch("/api/crush/destroy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText }),
      });
      setMessage(response.ok ? "Crush 数据已粉碎。刷新工作台后会回到未建档状态。" : "请输入 DELETE 才能粉碎。");
    });
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-6 sm:px-8 lg:py-10">
      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-blush-200/40 backdrop-blur">
        <p className="text-sm font-bold text-blush-700">设置与隐私</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-normal text-ink-900">
          默认保护原始材料，保留可控的虚拟资产。
        </h1>
        <div className="mt-6 grid gap-3 text-sm leading-7 text-ink-700">
          <p className="rounded-3xl bg-mint-100/55 p-4">图片参考默认生成后删除原图，只保留二次元角色资产和视觉标签。</p>
          <p className="rounded-3xl bg-mint-100/55 p-4">语音使用产品内合成声线，不做真实人物声音克隆。</p>
          <p className="rounded-3xl bg-mint-100/55 p-4">聊天文本只提取摘要标签，推测必须由用户确认后才入档。</p>
        </div>
        <div className="mt-8 rounded-3xl border border-blush-200 bg-blush-50 p-5">
          <h2 className="flex items-center gap-2 text-lg font-black text-ink-900">
            <Trash2 aria-hidden="true" size={20} />
            一键粉碎 Crush 数据
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-700">输入 DELETE 进行二次确认。该操作会删除当前 Crush 的聊天、情报、行动、回忆和生成资产引用。</p>
          <div className="mt-4 flex gap-2">
            <input
              className="min-h-12 flex-1 rounded-full border border-blush-100 bg-white px-4 font-bold outline-none focus:border-blush-500"
              placeholder="DELETE"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
            />
            <button className="rounded-full bg-ink-900 px-5 font-bold text-white disabled:opacity-60" disabled={isPending} type="button" onClick={destroy}>
              粉碎
            </button>
          </div>
          {message ? <p className="mt-3 text-sm font-bold text-blush-700">{message}</p> : null}
        </div>
      </section>
    </main>
  );
}
