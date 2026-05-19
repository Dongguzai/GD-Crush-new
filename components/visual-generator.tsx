"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, WandSparkles } from "lucide-react";
import { StatePanel } from "@/components/state-panel";
import { getClientErrorMessage, readApiResponse } from "@/lib/api-client";

const themes = [
  { id: "sunny_campus", label: "晴日校园", description: "阳光、课后、便利店、青春感" },
  { id: "city_healing", label: "都市治愈", description: "咖啡馆、雨夜、下班后、安静陪伴" },
  { id: "dream_otome", label: "梦幻乙女", description: "花园、星光、节日、强恋爱氛围" },
];

export function VisualGenerator() {
  const router = useRouter();
  const [theme, setTheme] = useState("sunny_campus");
  const [useReference, setUseReference] = useState(false);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function generate() {
    startTransition(async () => {
      try {
        setStatus("正在准备视觉标签...");
        let visualTags = {
          hairStyle: "柔和短发",
          hairColor: "深棕",
          outfitMood: "清爽、干净",
          overallVibe: "温柔但不黏人",
        };
        let referenceImageKey: string | undefined;

        if (useReference) {
          if (!referenceFile) {
            setStatus("请先选择一张参考图。");
            return;
          }

          setStatus("正在上传参考图...");
          const formData = new FormData();
          formData.append("file", referenceFile);
          const uploaded = await readApiResponse<{ temporaryObjectKey: string }>(
            await fetch("/api/uploads/reference-image", {
              method: "POST",
              body: formData,
            }),
            "参考图上传失败，请稍后重试。",
          );
          referenceImageKey = uploaded.temporaryObjectKey;

          setStatus("正在提取非身份化视觉标签...");
          const extracted = await readApiResponse<{ visualTags: typeof visualTags }>(
            await fetch("/api/visual/extract-tags", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ temporaryObjectKey: uploaded.temporaryObjectKey }),
            }),
            "视觉标签提取失败，请稍后重试。",
          );
          visualTags = extracted.visualTags;
        }

        setStatus("正在生成二次元角色资产，并持久化保存...");
        await readApiResponse(
          await fetch("/api/visual/generate-character", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ theme, visualTags, referenceImageKey }),
          }),
          "生成失败，请稍后重试。",
        );

        router.push("/app");
        router.refresh();
      } catch (nextError) {
        setStatus(getClientErrorMessage(nextError, "生成失败，请检查网络后重试。"));
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
            使用图片参考
          </span>
          原图只用于本次生成。生成完成后默认删除，只保留二次元角色和你确认的视觉标签。
        </span>
      </label>

      {useReference ? (
        <div className="grid gap-3 rounded-3xl border border-blush-100 bg-white p-4 text-sm text-ink-700">
          <input
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            type="file"
            onChange={(event) => setReferenceFile(event.target.files?.[0] ?? null)}
          />
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-ink-900/10 bg-white px-4 font-bold text-ink-900 transition hover:bg-blush-50"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            {referenceFile ? "重新选择参考图" : "选择参考图"}
          </button>
          <p className="text-sm leading-6">
            {referenceFile
              ? `已选择：${referenceFile.name}`
              : "支持 JPEG、PNG、WebP，最大 10MB。"}
          </p>
        </div>
      ) : null}

      {status ? (
        <StatePanel
          tone={isPending ? "loading" : "error"}
          title={isPending ? "生成进行中" : "视觉生成暂停了"}
          description={status}
        />
      ) : null}

      <button
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink-900 px-6 text-base font-bold text-white shadow-lg shadow-blush-200 transition hover:-translate-y-0.5 hover:bg-blush-700 disabled:opacity-60"
        disabled={isPending}
        type="button"
        onClick={generate}
      >
        <WandSparkles aria-hidden="true" size={18} />
        {isPending ? "正在生成..." : "生成角色并去见 TA"}
      </button>
    </div>
  );
}
