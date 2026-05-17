"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, WandSparkles } from "lucide-react";

const themes = [
  { id: "sunny_campus", label: "晴日校园", description: "阳光、课后、便利店、青春感" },
  { id: "city_healing", label: "都市治愈", description: "咖啡馆、雨夜、下班后、安静陪伴" },
  { id: "dream_otome", label: "梦幻乙女", description: "花园、星光、节日、强恋爱氛围" },
];

export function VisualGenerator() {
  const router = useRouter();
  const [theme, setTheme] = useState("sunny_campus");
  const [useReference, setUseReference] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  function generate() {
    startTransition(async () => {
      setStatus("正在准备参考图隐私流程...");
      let visualTags = {
        hairStyle: "柔和短发",
        hairColor: "深棕",
        outfitMood: "清爽、干净",
        overallVibe: "温柔但不黏人",
      };

      if (useReference) {
        const presign = await fetch("/api/uploads/reference-image/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: "image/png" }),
        }).then((response) => response.json() as Promise<{ temporaryObjectKey: string }>);
        setStatus("正在提取非身份化视觉标签...");
        const extracted = await fetch("/api/visual/extract-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ temporaryObjectKey: presign.temporaryObjectKey }),
        }).then((response) => response.json() as Promise<{ visualTags: typeof visualTags }>);
        visualTags = extracted.visualTags;
      }

      setStatus("正在生成二次元角色资产，并删除原始参考图...");
      const response = await fetch("/api/visual/generate-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, visualTags }),
      });

      if (response.ok) {
        router.push("/app");
        router.refresh();
      } else {
        setStatus("生成失败，请稍后重试。");
      }
    });
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {themes.map((item) => (
          <button
            key={item.id}
            className={`rounded-3xl border p-4 text-left transition ${
              theme === item.id
                ? "border-blush-500 bg-blush-50 shadow-lg shadow-blush-100"
                : "border-white bg-white hover:border-blush-200"
            }`}
            type="button"
            onClick={() => setTheme(item.id)}
          >
            <p className="font-extrabold text-ink-900">{item.label}</p>
            <p className="mt-2 text-sm leading-6 text-ink-700">{item.description}</p>
          </button>
        ))}
      </div>

      <label className="flex gap-3 rounded-3xl border border-mint-100 bg-mint-100/55 p-4 text-sm leading-6 text-ink-700">
        <input
          checked={useReference}
          className="mt-1 h-4 w-4 accent-mint-500"
          type="checkbox"
          onChange={(event) => setUseReference(event.target.checked)}
        />
        <span>
          <span className="mb-1 flex items-center gap-2 font-extrabold text-ink-900">
            <ImageUp aria-hidden="true" size={16} />
            使用图片参考 MVP mock 流程
          </span>
          原图只用于本次生成。生成完成后默认删除，只保留二次元角色和你确认的视觉标签。
        </span>
      </label>

      {status ? <p className="rounded-2xl bg-blush-50 p-3 text-sm font-bold text-blush-700">{status}</p> : null}

      <button
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink-900 px-6 text-base font-bold text-white shadow-lg shadow-blush-200 transition hover:-translate-y-0.5 hover:bg-blush-700 disabled:opacity-60"
        disabled={isPending}
        type="button"
        onClick={generate}
      >
        <WandSparkles aria-hidden="true" size={18} />
        {isPending ? "正在生成..." : "生成角色并进入工作台"}
      </button>
    </div>
  );
}
