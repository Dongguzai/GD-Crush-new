"use client";

import { useState, useTransition } from "react";
import { ClipboardCheck, MessagesSquare, Save, Send } from "lucide-react";
import { StatePanel } from "@/components/state-panel";
import { getClientErrorMessage, readApiResponse } from "@/lib/api-client";

type QuickResult = {
  practiceRunId: string;
  riskLevel: string;
  simulatedReply: string;
  coachAnalysis: { possibleFeeling?: string; mainRisk?: string; advice?: string };
  suggestedLine: string;
};

export function PracticeWorkbench() {
  const [tab, setTab] = useState<"quick" | "full">("quick");
  const [line, setLine] = useState("");
  const [result, setResult] = useState<QuickResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [simulationMessages, setSimulationMessages] = useState<string[]>([]);
  const [simulationInput, setSimulationInput] = useState("");
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success";
    title: string;
    description: string;
    retry?: () => void;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function runQuick() {
    if (!line.trim()) {
      setFeedback({
        tone: "error",
        title: "先写一句想测试的话",
        description: "空白消息无法判断风险，也没法给你更稳的表达。",
      });
      return;
    }

    setFeedback(null);
    setBusyLabel("正在评估这句话...");
    startTransition(async () => {
      try {
        const nextResult = await readApiResponse<QuickResult>(
          await fetch("/api/practice/quick-line", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenarioType: "invite", sendContext: "wechat", userLine: line }),
          }),
          "一句话测试失败，请稍后重试。",
        );
        setResult(nextResult);
      } catch (error) {
        setFeedback({
          tone: "error",
          title: "一句话测试没有完成",
          description: getClientErrorMessage(error, "一句话测试失败，请稍后重试。"),
          retry: runQuick,
        });
      } finally {
        setBusyLabel(null);
      }
    });
  }

  function saveAction() {
    if (!result) return;
    setFeedback(null);
    setBusyLabel("正在保存为现实行动...");
    startTransition(async () => {
      try {
        await readApiResponse(
          await fetch("/api/actions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              practiceRunId: result.practiceRunId,
              title: "一句话测试行动",
              suggestedMessage: result.suggestedLine,
            }),
          }),
          "保存现实行动失败，请重试。",
        );
        setFeedback({
          tone: "success",
          title: "已保存为现实行动",
          description: "你可以稍后去行动页记录真实反馈。",
        });
      } catch (error) {
        setFeedback({
          tone: "error",
          title: "行动还没保存",
          description: getClientErrorMessage(error, "保存现实行动失败，请重试。"),
          retry: saveAction,
        });
      } finally {
        setBusyLabel(null);
      }
    });
  }

  function startSimulation() {
    setFeedback(null);
    setBusyLabel("正在建立模拟场景...");
    startTransition(async () => {
      try {
        const data = await readApiResponse<{ sessionId: string }>(
          await fetch("/api/practice/full-simulation/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scenarioType: "apology",
              goal: "解释误会",
              background: "我想练习一段更克制的表达。",
            }),
          }),
          "完整模拟启动失败，请稍后重试。",
        );
        setSessionId(data.sessionId);
        setSimulationMessages(["模拟已开始。"]);
      } catch (error) {
        setFeedback({
          tone: "error",
          title: "完整模拟还没开始",
          description: getClientErrorMessage(error, "完整模拟启动失败，请稍后重试。"),
          retry: startSimulation,
        });
      } finally {
        setBusyLabel(null);
      }
    });
  }

  function sendSimulation() {
    if (!sessionId || !simulationInput.trim()) return;
    const message = simulationInput;
    setSimulationInput("");
    setFeedback(null);
    setBusyLabel("Crush 正在回应...");
    startTransition(async () => {
      try {
        const data = await readApiResponse<{ crushReply: string; coachTip: { advice: string } }>(
          await fetch("/api/practice/full-simulation/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, message }),
          }),
          "模拟消息发送失败，请重试。",
        );
        setSimulationMessages((current) => [
          ...current,
          `你：${message}`,
          `Crush：${data.crushReply}`,
          `Coach：${data.coachTip.advice}`,
        ]);
      } catch (error) {
        setSimulationInput(message);
        setFeedback({
          tone: "error",
          title: "这句还没送出去",
          description: getClientErrorMessage(error, "模拟消息发送失败，请重试。"),
          retry: sendSimulation,
        });
      } finally {
        setBusyLabel(null);
      }
    });
  }

  function finishSimulation() {
    if (!sessionId) return;
    setFeedback(null);
    setBusyLabel("正在生成复盘并保存行动...");
    startTransition(async () => {
      try {
        const data = await readApiResponse<{ suggestedAction: { id: string; suggestedLine: string } }>(
          await fetch("/api/practice/full-simulation/finish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          }),
          "复盘生成失败，请稍后重试。",
        );
        await readApiResponse(
          await fetch("/api/actions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              practiceRunId: data.suggestedAction.id,
              title: "完整演练后的现实行动",
              suggestedMessage: data.suggestedAction.suggestedLine,
            }),
          }),
          "复盘已生成，但保存现实行动失败。",
        );
        setSimulationMessages((current) => [...current, "复盘已生成，并保存为现实行动。"]);
        setFeedback({
          tone: "success",
          title: "完整演练已收束",
          description: "复盘和现实行动都已经保存。",
        });
      } catch (error) {
        setFeedback({
          tone: "error",
          title: "结束流程没有完成",
          description: getClientErrorMessage(error, "复盘生成失败，请稍后重试。"),
          retry: finishSimulation,
        });
      } finally {
        setBusyLabel(null);
      }
    });
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:py-10">
      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-blush-200/40 backdrop-blur">
        <p className="text-sm font-bold text-blush-700">实战演练模式</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-normal text-ink-900">
          先测试一句话，再决定要不要发。
        </h1>
        <p className="mt-4 text-base leading-7 text-ink-700">
          实战模式不会自动播放语音。Crush 模拟回应和 Coach 分析会明确分开，优先给保守建议。
        </p>
        <div className="mt-6 grid gap-2">
          <button
            className={`rounded-full px-5 py-3 text-left font-bold ${tab === "quick" ? "bg-ink-900 text-white" : "bg-white"}`}
            type="button"
            onClick={() => setTab("quick")}
          >
            一句话测试
          </button>
          <button
            className={`rounded-full px-5 py-3 text-left font-bold ${tab === "full" ? "bg-ink-900 text-white" : "bg-white"}`}
            type="button"
            onClick={() => setTab("full")}
          >
            完整对话模拟
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-2xl shadow-blush-200/40 backdrop-blur md:p-7">
        {busyLabel ? (
          <div className="mb-4">
            <StatePanel tone="loading" title="处理中" description={busyLabel} />
          </div>
        ) : null}
        {feedback ? (
          <div className="mb-4">
            <StatePanel
              tone={feedback.tone}
              title={feedback.title}
              description={feedback.description}
              actionLabel={feedback.retry ? "重试" : undefined}
              onAction={feedback.retry}
            />
          </div>
        ) : null}
        {tab === "quick" ? (
          <div className="grid gap-4">
            <textarea
              className="min-h-36 rounded-3xl border border-blush-100 bg-white px-4 py-3 text-base font-semibold leading-7 outline-none focus:border-blush-500"
              placeholder="把你想发给 TA 的话放这里..."
              value={line}
              onChange={(event) => setLine(event.target.value)}
            />
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink-900 px-6 font-bold text-white disabled:opacity-60"
              disabled={isPending}
              type="button"
              onClick={runQuick}
            >
              <ClipboardCheck aria-hidden="true" size={18} />
              开始测试
            </button>
            {result ? (
              <div className="grid gap-3 rounded-3xl bg-blush-50 p-5 text-sm leading-7">
                <p className="font-black text-ink-900">风险等级：{result.riskLevel}</p>
                <p>模拟回应：{result.simulatedReply}</p>
                <p>可能感受：{result.coachAnalysis.possibleFeeling}</p>
                <p>主要风险：{result.coachAnalysis.mainRisk}</p>
                <p className="rounded-2xl bg-white p-3 font-bold">更稳表达：{result.suggestedLine}</p>
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 font-bold text-ink-900"
                  type="button"
                  onClick={saveAction}
                >
                  <Save aria-hidden="true" size={17} />
                  保存为现实行动
                </button>
              </div>
            ) : (
              <StatePanel tone="empty" title="还没有测试结果" description="先放入一句你想发的话，系统会给出风险判断和更稳表达。" />
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink-900 px-6 font-bold text-white disabled:opacity-60"
              disabled={isPending}
              type="button"
              onClick={startSimulation}
            >
              <MessagesSquare aria-hidden="true" size={18} />
              开始完整模拟
            </button>
            <div className="min-h-64 rounded-3xl bg-blush-50 p-4 text-sm leading-7 text-ink-700">
              {simulationMessages.length ? (
                simulationMessages.map((item, index) => (
                  <p key={`${item}-${index}`} className="mb-2 rounded-2xl bg-white/75 p-3">
                    {item}
                  </p>
                ))
              ) : (
                <StatePanel tone="empty" title="模拟还没开始" description="先启动一轮完整对话，再把你想练习的表达逐句放进来。" />
              )}
            </div>
            <div className="flex gap-2">
              <input
                className="min-h-12 flex-1 rounded-full border border-blush-100 bg-white px-4 font-semibold outline-none focus:border-blush-500"
                placeholder="输入你的下一句..."
                value={simulationInput}
                onChange={(event) => setSimulationInput(event.target.value)}
              />
              <button className="h-12 w-12 rounded-full bg-ink-900 text-white disabled:opacity-60" disabled={isPending || !sessionId} type="button" onClick={sendSimulation}>
                <Send className="mx-auto" aria-hidden="true" size={18} />
              </button>
            </div>
            <button className="rounded-full bg-white px-5 py-3 font-bold text-ink-900 disabled:opacity-60" disabled={isPending || !sessionId} type="button" onClick={finishSimulation}>
              结束并保存复盘行动
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
