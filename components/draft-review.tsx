"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, PencilLine } from "lucide-react";
import { StatePanel } from "@/components/state-panel";
import { getClientErrorMessage, readApiResponse } from "@/lib/api-client";

type Draft = {
  id: string;
  factsJson: unknown[];
  inferredTraitsJson: unknown[];
  boundariesJson: unknown[];
  recommendedStage: string;
  interactionTemperature: string;
  confidence: number;
};

export function DraftReview({ draft }: { draft: Draft }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);

    startTransition(async () => {
      try {
        await readApiResponse(
          await fetch("/api/onboarding/confirm-draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              draftId: draft.id,
              realRelationshipStage: draft.recommendedStage,
              interactionTemperature: draft.interactionTemperature,
            }),
          }),
          "草稿确认失败，请稍后重试。",
        );
        router.push("/onboarding/visual");
      } catch (nextError) {
        setError(getClientErrorMessage(nextError, "草稿确认失败，请稍后重试。"));
      }
    });
  }

  return (
    <div className="grid gap-5">
      <Section title="已确认事实候选" items={draft.factsJson} />
      <Section title="推测性格 / 沟通模式" items={draft.inferredTraitsJson} />
      <Section title="沟通雷区" items={draft.boundariesJson} />

      <div className="grid gap-3 rounded-3xl border border-mint-100 bg-mint-100/45 p-5 sm:grid-cols-3">
        <Metric label="建议阶段" value={draft.recommendedStage} />
        <Metric label="互动温度" value={draft.interactionTemperature} />
        <Metric label="置信度" value={`${Math.round(draft.confidence * 100)}%`} />
      </div>

      {error ? <StatePanel tone="error" title="草稿还没写入" description={error} /> : null}

      <button
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink-900 px-6 text-base font-bold text-white shadow-lg shadow-blush-200 transition hover:-translate-y-0.5 hover:bg-blush-700 disabled:opacity-60"
        disabled={isPending}
        type="button"
        onClick={confirm}
      >
        <CheckCircle2 aria-hidden="true" size={18} />
        {isPending ? "正在写入档案..." : "确认草稿，继续选择视觉主题"}
      </button>
    </div>
  );
}

function Section({ title, items }: { title: string; items: unknown[] }) {
  return (
    <section className="rounded-3xl border border-blush-100 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-ink-900">
        <PencilLine aria-hidden="true" size={18} />
        {title}
      </h2>
      <div className="grid gap-3">
        {items.length ? (
          items.map((item, index) => <Item key={index} item={item} />)
        ) : (
          <p className="text-sm text-ink-700">暂无内容。</p>
        )}
      </div>
    </section>
  );
}

function Item({ item }: { item: unknown }) {
  const value = item as { label?: string; value?: string; confidence?: number };
  return (
    <div className="rounded-2xl bg-blush-50/70 p-3 text-sm leading-6 text-ink-700">
      <p className="font-extrabold text-ink-900">{value.label ?? "未命名条目"}</p>
      {value.value ? <p>{value.value}</p> : null}
      {typeof value.confidence === "number" ? <p>置信度：{Math.round(value.confidence * 100)}%</p> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-ink-700">{label}</p>
      <p className="mt-1 text-lg font-black text-ink-900">{value}</p>
    </div>
  );
}
