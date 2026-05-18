"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { StatePanel } from "@/components/state-panel";
import { getClientErrorMessage, readApiResponse } from "@/lib/api-client";

export function CreateCrushForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    const nickname = String(formData.get("nickname") ?? "").trim();
    const pastedChat = String(formData.get("pastedChat") ?? "").trim();

    if (!nickname) {
      setError("先给 TA 一个昵称，方便建立档案。");
      return;
    }

    if (pastedChat && !privacyConfirmed) {
      setError("粘贴聊天文本前，请先确认你已经移除敏感信息。");
      return;
    }

    startTransition(async () => {
      try {
        await readApiResponse(
          await fetch("/api/crush", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nickname,
              relationshipOrigin: String(formData.get("relationshipOrigin") ?? ""),
              currentStageGuess: String(formData.get("currentStageGuess") ?? "普通朋友"),
              lastInteraction: String(formData.get("lastInteraction") ?? ""),
              userGoal: String(formData.get("userGoal") ?? ""),
              userAnxiety: String(formData.get("userAnxiety") ?? ""),
            }),
          }),
          "创建 Crush 草稿失败，请检查输入。",
        );

        const materialPayloads = [
          { materialType: "user_text", sanitizedText: String(formData.get("personalityNotes") ?? "") },
          { materialType: "event_note", sanitizedText: String(formData.get("eventNotes") ?? "") },
          { materialType: "pasted_chat", sanitizedText: pastedChat },
        ].filter((item) => item.sanitizedText.trim().length > 0);

        for (const payload of materialPayloads) {
          await readApiResponse(
            await fetch("/api/onboarding/materials", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }),
            "材料保存失败，请稍后重试。",
          );
        }

        const draft = await readApiResponse<{ draftId: string }>(
          await fetch("/api/onboarding/analyze", { method: "POST" }),
          "AI 建档草稿生成失败，请稍后重试。",
        );
        router.push(`/onboarding/review?draftId=${draft.draftId}`);
      } catch (nextError) {
        setError(getClientErrorMessage(nextError, "创建流程失败，请稍后重试。"));
      }
    });
  }

  return (
    <form action={submit} className="grid gap-5">
      <Field label="TA 的昵称" name="nickname" placeholder="比如：林夏" required />
      <Field label="你们怎么认识" name="relationshipOrigin" placeholder="朋友介绍、同事、社团、同学..." />
      <label className="grid gap-2 text-sm font-bold text-ink-700">
        当前现实关系阶段
        <select
          className="min-h-12 rounded-3xl border border-blush-100 bg-white px-4 text-base font-semibold text-ink-900 outline-none transition focus:border-blush-500"
          name="currentStageGuess"
          defaultValue="普通朋友"
        >
          {["陌生/未接触", "点头之交", "普通朋友", "熟悉朋友", "暧昧试探", "冷却/疏远"].map((stage) => (
            <option key={stage}>{stage}</option>
          ))}
        </select>
      </label>
      <Field label="最近一次互动" name="lastInteraction" placeholder="例如：昨天聊了电影，她回复比较慢但有接话。" />
      <Field label="你的目标" name="userGoal" placeholder="例如：自然约她看电影。" />
      <Field label="你最担心的事" name="userAnxiety" placeholder="例如：担心太主动、担心尴尬。" />
      <TextArea label="TA 的性格/兴趣补充" name="personalityNotes" placeholder="慢热、喜欢悬疑电影、不太喜欢被连续追问..." />
      <TextArea label="事件记录" name="eventNotes" placeholder="可以写几条你们之间发生过的真实事件。" />
      <TextArea label="脱敏聊天文本" name="pastedChat" placeholder="可选。粘贴前请移除姓名、手机号、地址、账号、公司/学校等敏感信息。" />

      <label className="flex gap-3 rounded-3xl border border-mint-100 bg-mint-100/55 p-4 text-sm leading-6 text-ink-700">
        <input
          checked={privacyConfirmed}
          className="mt-1 h-4 w-4 accent-mint-500"
          type="checkbox"
          onChange={(event) => setPrivacyConfirmed(event.target.checked)}
        />
        <span className="flex-1">
          <span className="mb-1 flex items-center gap-2 font-extrabold text-ink-900">
            <LockKeyhole aria-hidden="true" size={16} />
            隐私确认
          </span>
          我确认粘贴内容已经脱敏。AI 只提取摘要标签，所有推测都需要我确认后才会入档。
        </span>
      </label>

      {error ? <StatePanel tone="error" title="创建流程暂停了" description={error} /> : null}

      <button
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink-900 px-6 text-base font-bold text-white shadow-lg shadow-blush-200 transition hover:-translate-y-0.5 hover:bg-blush-700 disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        <Sparkles aria-hidden="true" size={18} />
        {isPending ? "正在生成档案草稿..." : "生成 AI 建档草稿"}
        <ArrowRight aria-hidden="true" size={18} />
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-ink-700">
      {label}
      <input
        className="min-h-12 rounded-3xl border border-blush-100 bg-white px-4 text-base font-semibold text-ink-900 outline-none transition placeholder:text-ink-700/45 focus:border-blush-500"
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function TextArea({ label, name, placeholder }: { label: string; name: string; placeholder: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-ink-700">
      {label}
      <textarea
        className="min-h-28 resize-y rounded-3xl border border-blush-100 bg-white px-4 py-3 text-base font-semibold leading-7 text-ink-900 outline-none transition placeholder:text-ink-700/45 focus:border-blush-500"
        name={name}
        placeholder={placeholder}
      />
    </label>
  );
}
