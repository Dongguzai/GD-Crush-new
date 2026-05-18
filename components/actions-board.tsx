"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { StatePanel } from "@/components/state-panel";
import { getClientErrorMessage, readApiResponse } from "@/lib/api-client";

type Action = {
  id: string;
  title: string;
  suggestedMessage?: string | null;
  status: string;
};

type Suggestion = {
  id: string;
  suggestionJson: { facts?: { label: string; value?: string }[]; inferredTraits?: { label: string; value?: string }[] };
  confidence: number;
  status: string;
};

export function ActionsBoard() {
  const [actions, setActions] = useState<Action[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pendingSuggestions = useMemo(
    () => suggestions.filter((item) => item.status === "pending"),
    [suggestions],
  );

  const load = useCallback(async () => {
    try {
      const data = await readApiResponse<{ actions: Action[]; suggestions: Suggestion[] }>(
        await fetch("/api/actions"),
        "行动数据加载失败，请稍后重试。",
      );
      setActions(data.actions);
      setSuggestions(data.suggestions);
    } catch (error) {
      setLoadError(getClientErrorMessage(error, "行动数据加载失败，请稍后重试。"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  function retryLoad() {
    setIsLoading(true);
    setLoadError(null);
    void load();
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/actions")
      .then((response) =>
        readApiResponse<{ actions: Action[]; suggestions: Suggestion[] }>(
          response,
          "行动数据加载失败，请稍后重试。",
        ),
      )
      .then((data) => {
        if (!cancelled) {
          setActions(data.actions);
          setSuggestions(data.suggestions);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(getClientErrorMessage(error, "行动数据加载失败，请稍后重试。"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function updateAction(id: string, status: string) {
    setFeedback(null);
    startTransition(async () => {
      try {
        await readApiResponse(
          await fetch(`/api/actions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status,
              feedbackText: status === "positive_response" ? "对方回复比较积极，愿意继续聊。" : "已记录反馈。",
            }),
          }),
          "行动状态更新失败，请重试。",
        );
        await load();
      } catch (error) {
        setFeedback(getClientErrorMessage(error, "行动状态更新失败，请重试。"));
      }
    });
  }

  function resolve(id: string, decision: "accepted" | "rejected") {
    setFeedback(null);
    startTransition(async () => {
      try {
        await readApiResponse(
          await fetch(`/api/profile-update-suggestions/${id}/resolve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision }),
          }),
          "建议处理失败，请重试。",
        );
        await load();
      } catch (error) {
        setFeedback(getClientErrorMessage(error, "建议处理失败，请重试。"));
      }
    });
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
        <StatePanel tone="loading" title="正在整理行动与建议" description="稍等一下，把最近的现实反馈同步过来。" />
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
        <StatePanel tone="error" title="行动页暂时没加载出来" description={loadError} actionLabel="重新加载" onAction={retryLoad} />
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[1fr_1fr] lg:py-10">
      {feedback ? (
        <div className="lg:col-span-2">
          <StatePanel tone="error" title="刚才的操作没有完成" description={feedback} actionLabel="刷新当前数据" onAction={retryLoad} />
        </div>
      ) : null}
      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-blush-200/40 backdrop-blur">
        <p className="text-sm font-bold text-blush-700">现实行动</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-normal text-ink-900">
          把演练结果放回现实里。
        </h1>
        <div className="mt-6 grid gap-3">
          {actions.length ? (
            actions.map((action) => (
              <article key={action.id} className="rounded-3xl bg-blush-50 p-4 text-sm leading-7">
                <p className="font-black text-ink-900">{action.title}</p>
                <p>{action.suggestedMessage}</p>
                <p className="font-bold">状态：{action.status}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="rounded-full bg-white px-4 py-2 font-bold" disabled={isPending} type="button" onClick={() => updateAction(action.id, "sent")}>
                    已发送
                  </button>
                  <button className="rounded-full bg-white px-4 py-2 font-bold" disabled={isPending} type="button" onClick={() => updateAction(action.id, "positive_response")}>
                    积极回应
                  </button>
                  <button className="rounded-full bg-white px-4 py-2 font-bold" disabled={isPending} type="button" onClick={() => updateAction(action.id, "cold_response")}>
                    冷淡回应
                  </button>
                </div>
              </article>
            ))
          ) : (
            <StatePanel tone="empty" title="还没有现实行动" description="先去演练页保存一个更稳的表达，再回来记录真实反馈。" />
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-mint-100/60 backdrop-blur">
        <p className="text-sm font-bold text-mint-500">待确认情报更新</p>
        <h2 className="mt-2 text-2xl font-black text-ink-900">AI 只提建议，你来确认。</h2>
        <div className="mt-6 grid gap-3">
          {pendingSuggestions.length ? (
            pendingSuggestions.map((suggestion) => (
              <article key={suggestion.id} className="rounded-3xl bg-mint-100/55 p-4 text-sm leading-7">
                {(suggestion.suggestionJson.facts ?? []).map((fact, index) => (
                  <p key={index}>事实候选：{fact.label} {fact.value}</p>
                ))}
                {(suggestion.suggestionJson.inferredTraits ?? []).map((trait, index) => (
                  <p key={index}>推测：{trait.label} {trait.value}</p>
                ))}
                <p className="font-bold">置信度：{Math.round(suggestion.confidence * 100)}%</p>
                <div className="mt-3 flex gap-2">
                  <button className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 font-bold disabled:opacity-60" disabled={isPending} type="button" onClick={() => resolve(suggestion.id, "accepted")}>
                    <Check aria-hidden="true" size={16} />
                    确认入档
                  </button>
                  <button className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 font-bold disabled:opacity-60" disabled={isPending} type="button" onClick={() => resolve(suggestion.id, "rejected")}>
                    <X aria-hidden="true" size={16} />
                    拒绝
                  </button>
                </div>
              </article>
            ))
          ) : (
            <StatePanel tone="empty" title="暂无待确认建议" description="新的现实反馈产生后，AI 建议会先停在这里等你决定。" />
          )}
        </div>
      </section>
    </main>
  );
}
