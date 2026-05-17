"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export function AgeGateForm() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!checked) {
      setError("请先确认年龄与用途声明。");
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/onboarding/age-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "确认失败，请稍后重试。");
        return;
      }

      router.push("/onboarding/create");
      router.refresh();
    });
  }

  return (
    <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-2xl shadow-blush-200/60 backdrop-blur md:p-8">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-100 text-mint-500">
        <ShieldCheck aria-hidden="true" size={26} />
      </div>
      <h1 className="font-display text-4xl font-semibold tracking-normal text-ink-900">
        先确认这是一间 18+ 的私密练习室。
      </h1>
      <p className="mt-4 text-base leading-7 text-ink-700">
        GD Crush 用于虚拟陪伴、表达练习和情绪整理，不是现实对象本人，也不提供医疗、法律或专业心理治疗服务。
      </p>

      <label className="mt-7 flex gap-3 rounded-3xl border border-blush-100 bg-blush-50/70 p-4 text-sm leading-6 text-ink-700">
        <input
          checked={checked}
          className="mt-1 h-4 w-4 accent-blush-500"
          type="checkbox"
          onChange={(event) => setChecked(event.target.checked)}
        />
        <span>
          我确认已年满 18 岁，并理解虚拟亲密度不代表现实关系进展。产品会鼓励尊重边界和冷静行动。
        </span>
      </label>

      {error ? <p className="mt-4 text-sm font-semibold text-blush-700">{error}</p> : null}

      <button
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink-900 px-6 text-base font-bold text-white shadow-lg shadow-blush-200 transition hover:-translate-y-0.5 hover:bg-blush-700 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
        disabled={isPending}
        type="button"
        onClick={submit}
      >
        {isPending ? "正在进入..." : "我已确认，进入 GD Crush"}
      </button>
    </div>
  );
}
