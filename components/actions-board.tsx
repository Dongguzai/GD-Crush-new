"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, ChevronUp, CornerDownLeft, Edit3, SkipForward, ThumbsUp } from "lucide-react";
import { StatePanel } from "@/components/state-panel";
import { getClientErrorMessage, readApiResponse } from "@/lib/api-client";

/** Canonical action status that maps from legacy statuses */
type ActionStatus = "pending" | "done" | "skipped";

type RealityEvent = {
  id: string;
  sourceType: string | null;
  eventText: string;
  eventType: string;
  occurredAtText: string | null;
  status: string;
  createdAt: string | Date;
};

type RealitySignal = {
  id: string;
  eventId: string | null;
  signalType: string;
  label: string;
  description: string | null;
  polarity: string;
  confidence: number | null;
  status: string;
};

type RealityInference = {
  id: string;
  eventId: string | null;
  inferenceType: string;
  label: string;
  description: string | null;
  confidence: number | null;
  status: string;
};

type SourceChapter = {
  id: string;
  title: string;
  scenarioType: string;
  background: string;
  recapSummary: string | null;
  coachAnalysisJson: {
    summary?: string;
    riskPoints?: string[];
    recommendedNextAction?: string;
  } | null;
} | null;

type HydratedAction = {
  id: string;
  title: string;
  suggestedMessage: string | null;
  status: string;
  feedbackText: string | null;
  executedAt: string | Date | null;
  createdAt: string | Date;
  sourceChapter: SourceChapter;
  linkedRealityLayer: {
    realityEvents: RealityEvent[];
    realitySignals: RealitySignal[];
    realityInferences: RealityInference[];
  };
};

type Suggestion = {
  id: string;
  suggestionJson: {
    facts?: { label: string; value?: string }[];
    inferredTraits?: { label: string; value?: string }[];
  };
  confidence: number;
  status: string;
};

/** Map legacy statuses to canonical statuses */
function canonicalStatus(legacy: string): ActionStatus {
  if (legacy === "pending" || legacy === "sent") return "pending";
  if (legacy === "positive_response" || legacy === "neutral_response" || legacy === "cold_response") return "done";
  if (legacy === "skipped") return "skipped";
  return "pending";
}

function statusLabel(legacy: string): string {
  const map: Record<string, string> = {
    pending: "尚未执行",
    sent: "已经行动",
    positive_response: "对方反馈积极",
    neutral_response: "对方反馈中性",
    cold_response: "对方反馈偏冷",
    skipped: "暂未行动",
  };
  return map[legacy] ?? legacy;
}

function polarityColor(polarity: string): string {
  if (polarity === "positive") return "bg-amber-50 text-amber-700 border-amber-200";
  if (polarity === "negative") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-gray-50 text-gray-600 border-gray-200";
}

function ActionCard({ action, onUpdate }: { action: HydratedAction; onUpdate: (id: string, status: string, feedbackText: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [feedbackText, setFeedbackText] = useState(action.feedbackText ?? "");
  const [isPending, startTransition] = useTransition();
  const feedbackRef = useRef<HTMLTextAreaElement>(null);

  const status = canonicalStatus(action.status);
  const signals = action.linkedRealityLayer.realitySignals;
  const inferences = action.linkedRealityLayer.realityInferences;
  const events = action.linkedRealityLayer.realityEvents;

  function submitFeedback(legacyStatus: string) {
    startTransition(async () => {
      onUpdate(action.id, legacyStatus, feedbackText);
      setFeedbackMode(false);
    });
  }

  function submitTextFeedback() {
    if (!feedbackText.trim()) return;
    // Infer outcome tone from text for legacy status
    const lower = feedbackText.toLowerCase();
    const legacyStatus =
      lower.includes("好") || lower.includes("可以") || lower.includes("不错") || lower.includes("棒")
        ? "positive_response"
        : lower.includes("没") || lower.includes("不") || lower.includes("算了") || lower.includes("忙")
          ? "cold_response"
          : "neutral_response";
    submitFeedback(legacyStatus);
  }

  return (
    <article className="rounded-2xl border border-blush-200/60 bg-blush-50/40 p-3.5 text-sm shadow-sm sm:rounded-3xl sm:p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-black text-ink-900 leading-snug">{action.title}</p>
          {action.suggestedMessage && (
            <p className="mt-1 text-xs text-ink-600 leading-relaxed line-clamp-2 sm:text-sm">{action.suggestedMessage}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold sm:px-3 sm:py-1 sm:text-xs ${
            status === "done"
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : status === "skipped"
                ? "border-slate-300 bg-slate-100 text-slate-500"
                : "border-amber-300 bg-amber-50 text-amber-700"
          }`}
        >
          {status === "done" ? "已完成" : status === "skipped" ? "跳过" : "待执行"}
        </span>
      </div>

      {/* Status + action buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {status === "pending" && !feedbackMode && (
          <>
            <button
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink-700 shadow-sm transition hover:bg-amber-50 disabled:opacity-60 sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm"
              disabled={isPending}
              type="button"
              onClick={() => submitFeedback("sent")}
            >
              <CornerDownLeft size={12} className="sm:size-[13px]" />
              <span className="hidden sm:inline">已发送</span>
              <span className="sm:hidden">发送</span>
            </button>
            <button
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink-700 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60 sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm"
              disabled={isPending}
              type="button"
              onClick={() => {
                setFeedbackMode(true);
                setTimeout(() => feedbackRef.current?.focus(), 50);
              }}
            >
              <Edit3 size={12} className="sm:size-[13px]" />
              记录
            </button>
            <button
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm"
              disabled={isPending}
              type="button"
              onClick={() => submitFeedback("skipped")}
            >
              <SkipForward size={12} className="sm:size-[13px]" />
              <span className="hidden sm:inline">跳过</span>
              <span className="sm:hidden">跳</span>
            </button>
          </>
        )}
        {status === "pending" && feedbackMode && (
          <div className="w-full">
            <textarea
              ref={feedbackRef}
              className="w-full rounded-2xl border border-blush-200 bg-white p-2.5 text-sm text-ink-800 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-blush-300/50 resize-none sm:p-3 sm:text-base"
              placeholder="记录现实里发生了什么……"
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submitTextFeedback();
                }
              }}
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[10px] text-ink-400 sm:text-xs">⌘+Enter 提交</p>
              <div className="flex gap-1.5 sm:gap-2">
                <button
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 sm:px-4 sm:py-2 sm:text-sm"
                  disabled={isPending}
                  type="button"
                  onClick={() => setFeedbackMode(false)}
                >
                  取消
                </button>
                <button
                  className="inline-flex items-center gap-1 rounded-full bg-blush-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blush-600 disabled:opacity-60 sm:gap-1 sm:px-4 sm:py-2 sm:text-sm"
                  disabled={isPending || !feedbackText.trim()}
                  type="button"
                  onClick={submitTextFeedback}
                >
                  <ThumbsUp size={12} className="sm:size-[13px]" />
                  记录
                </button>
              </div>
            </div>
          </div>
        )}
        {status !== "pending" && !feedbackMode && (
          <div className="flex w-full flex-wrap items-center gap-2">
            <span className="text-xs text-ink-500 sm:text-sm">
              {statusLabel(action.status)}
              {action.feedbackText && `：${action.feedbackText}`}
            </span>
            <button
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-50 sm:px-3 sm:py-1 sm:text-xs"
              type="button"
              onClick={() => setFeedbackMode(true)}
            >
              <Edit3 size={10} className="sm:size-4" />
              补充
            </button>
          </div>
        )}
        {status !== "pending" && feedbackMode && (
          <div className="w-full">
            <textarea
              ref={feedbackRef}
              className="w-full rounded-2xl border border-blush-200 bg-white p-2.5 text-sm text-ink-800 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-blush-300/50 resize-none sm:p-3 sm:text-base"
              placeholder="补充更多反馈……"
              rows={2}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
            <div className="mt-2 flex justify-end gap-1.5 sm:gap-2">
              <button
                className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 sm:px-4 sm:py-2 sm:text-sm"
                type="button"
                onClick={() => setFeedbackMode(false)}
              >
                取消
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-full bg-blush-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blush-600 disabled:opacity-60 sm:gap-1 sm:px-4 sm:py-2 sm:text-sm"
                disabled={isPending || !feedbackText.trim()}
                type="button"
                onClick={submitTextFeedback}
              >
                保存
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Source chapter summary */}
      {action.sourceChapter && (
        <div className="mt-3 rounded-xl border border-blush-100 bg-white/70 p-2.5 sm:mt-3 sm:rounded-2xl sm:p-3">
          <p className="text-[10px] font-bold text-blush-600 sm:text-xs">
            演练：{action.sourceChapter.title}
          </p>
          {action.sourceChapter.recapSummary && (
            <p className="mt-1 text-[10px] text-ink-500 leading-relaxed sm:text-xs">{action.sourceChapter.recapSummary}</p>
          )}
          {action.sourceChapter.coachAnalysisJson?.recommendedNextAction && (
            <p className="mt-1 hidden text-[10px] italic text-ink-400 sm:block sm:text-xs">
              下一步：{action.sourceChapter.coachAnalysisJson.recommendedNextAction}
            </p>
          )}
        </div>
      )}

      {/* Linked reality layer */}
      {(signals.length > 0 || inferences.length > 0 || events.length > 0) && (
        <div className="mt-3">
          <button
            className="inline-flex items-center gap-1 text-[10px] font-bold text-blush-600 transition hover:text-blush-700 sm:text-xs"
            type="button"
            onClick={() => setExpanded((v) => !v)}
          >
            现实信号
            {signals.length > 0 && (
              <span className="rounded-full bg-amber-100 px-1 py-0.5 text-[10px] text-amber-700 sm:px-1.5 sm:py-0.5 sm:text-xs">{signals.length}</span>
            )}
            {expanded ? <ChevronUp size={11} className="sm:size-3" /> : <ChevronDown size={11} className="sm:size-3" />}
          </button>

          {expanded && (
            <div className="mt-2 flex flex-col gap-1.5 sm:gap-2">
              {signals.map((signal) => (
                <div
                  key={signal.id}
                  className={`rounded-xl border px-2.5 py-2 text-[11px] leading-relaxed sm:px-3 sm:py-2 sm:text-xs ${polarityColor(signal.polarity)}`}
                >
                  <span className="font-black">{signal.label}</span>
                  {signal.description && <span className="ml-1 text-ink-600">{signal.description}</span>}
                </div>
              ))}
              {inferences.map((inference) => (
                <div key={inference.id} className="rounded-xl border border-violet-100 bg-violet-50 px-2.5 py-2 text-[11px] leading-relaxed text-violet-700 sm:px-3 sm:py-2 sm:text-xs">
                  <span className="font-black">{inference.label}</span>
                  {inference.description && <span className="ml-1">{inference.description}</span>}
                  {inference.confidence !== null && (
                    <span className="ml-1 text-violet-400">
                      {Math.round(inference.confidence * 100)}%
                    </span>
                  )}
                </div>
              ))}
              {events
                .filter((e) => e.eventType === "action_feedback")
                .map((event) => (
                  <div key={event.id} className="rounded-xl border border-blush-100 bg-blush-25 px-2.5 py-2 text-[11px] leading-relaxed text-blush-700 sm:px-3 sm:py-2 sm:text-xs">
                    {event.occurredAtText && (
                      <span className="mr-1 font-bold">[{event.occurredAtText}]</span>
                    )}
                    {event.eventText}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function ActionsBoard() {
  const [hydratedActions, setHydratedActions] = useState<HydratedAction[]>([]);
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
      const data = await readApiResponse<{ actions: HydratedAction[] }>(
        await fetch("/api/actions"),
        "行动数据加载失败，请稍后重试。",
      );
      setHydratedActions(data.actions);
      // Suggestions still come from legacy endpoint
      const suggestionData = await readApiResponse<{ suggestions: Suggestion[] }>(
        await fetch("/api/profile-update-suggestions"),
        "建议加载失败。",
      );
      setSuggestions(suggestionData.suggestions);
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
      .then((response) => readApiResponse<{ actions: HydratedAction[] }>(response, "行动数据加载失败，请稍后重试。"))
      .then((data) => {
        if (!cancelled) setHydratedActions(data.actions);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(getClientErrorMessage(error, "行动数据加载失败，请稍后重试。"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    fetch("/api/profile-update-suggestions")
      .then((response) => readApiResponse<{ suggestions: Suggestion[] }>(response, "建议加载失败。"))
      .then((data) => {
        if (!cancelled) setSuggestions(data.suggestions);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  function updateAction(id: string, status: string, feedbackText: string) {
    setFeedback(null);
    startTransition(async () => {
      try {
        await readApiResponse(
          await fetch(`/api/actions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status,
              feedbackText: feedbackText || null,
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
      <main className="mx-auto w-full px-4 py-5 sm:mx-auto sm:max-w-6xl sm:px-6 sm:py-6 lg:px-8 lg:py-10">
        <StatePanel tone="loading" title="正在整理现实行动" description="把演练结果和现实反馈同步过来。" />
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto w-full px-4 py-5 sm:mx-auto sm:max-w-6xl sm:px-6 sm:py-6 lg:px-8 lg:py-10">
        <StatePanel tone="error" title="行动页暂时没加载出来" description={loadError} actionLabel="重新加载" onAction={retryLoad} />
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[1fr_1fr] lg:px-8 lg:py-10">
      {feedback ? (
        <div className="lg:col-span-2">
          <StatePanel tone="error" title="刚才的操作没有完成" description={feedback} actionLabel="刷新当前数据" onAction={retryLoad} />
        </div>
      ) : null}

      {/* Actions section */}
      <section className="rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-2xl shadow-blush-200/40 backdrop-blur sm:p-6">
        <p className="text-xs font-bold text-blush-700 sm:text-sm">现实行动</p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-normal text-ink-900 sm:mt-2 sm:text-3xl">
          把演练结果放回现实里。
        </h1>
        <p className="mt-1 text-[10px] text-ink-400 sm:text-xs">
          记录真实发生的反馈，让后续演练更准确。
        </p>
        <div className="mt-4 grid gap-2.5 sm:mt-5 sm:grid-gap-3 sm:gap-3">
          {hydratedActions.length ? (
            hydratedActions.map((action) => (
              <ActionCard key={action.id} action={action} onUpdate={updateAction} />
            ))
          ) : (
            <StatePanel
              tone="empty"
              title="还没有现实行动"
              description="在聊天里完成演练后，你可以把建议保存为现实行动，再来这里记录真实发生的反馈。"
            />
          )}
        </div>
      </section>

      {/* Suggestions section */}
      <section className="rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-2xl shadow-mint-100/60 backdrop-blur sm:p-6">
        <p className="text-xs font-bold text-mint-500 sm:text-sm">待确认情报更新</p>
        <h2 className="mt-1.5 text-xl font-black text-ink-900 sm:mt-2 sm:text-2xl">AI 只提建议，你来确认。</h2>
        <div className="mt-4 grid gap-2.5 sm:mt-6 sm:gap-3">
          {pendingSuggestions.length ? (
            pendingSuggestions.map((suggestion) => (
              <article key={suggestion.id} className="rounded-2xl bg-mint-100/55 p-3.5 text-sm leading-6 sm:rounded-3xl sm:p-4">
                {(suggestion.suggestionJson.facts ?? []).map((fact, index) => (
                  <p key={index}>
                    事实候选：{fact.label} {fact.value}
                  </p>
                ))}
                {(suggestion.suggestionJson.inferredTraits ?? []).map((trait, index) => (
                  <p key={index}>
                    推测：{trait.label} {trait.value}
                  </p>
                ))}
                <p className="font-bold">置信度：{Math.round(suggestion.confidence * 100)}%</p>
                <div className="mt-2.5 flex gap-1.5 sm:mt-3 sm:gap-2">
                  <button
                    className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 sm:gap-1 sm:px-4 sm:py-2 sm:text-sm"
                    disabled={isPending}
                    type="button"
                    onClick={() => resolve(suggestion.id, "accepted")}
                  >
                    <Check aria-hidden="true" size={14} />
                    确认
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 disabled:opacity-60 sm:gap-1 sm:px-4 sm:py-2 sm:text-sm"
                    disabled={isPending}
                    type="button"
                    onClick={() => resolve(suggestion.id, "rejected")}
                  >
                    <SkipForward aria-hidden="true" size={14} />
                    跳过
                  </button>
                </div>
              </article>
            ))
          ) : (
            <StatePanel
              tone="empty"
              title="暂无待确认建议"
              description="新的现实反馈产生后，AI 建议会先停在这里等你决定。"
            />
          )}
        </div>
      </section>
    </main>
  );
}
