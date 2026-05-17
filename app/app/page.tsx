import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircleHeart, ShieldCheck, Sparkles } from "lucide-react";
import { getCurrentCrushProfileDetail } from "@/lib/repositories";

function stageText(stage?: string) {
  return stage ?? "尚未建档";
}

export default async function DashboardPage() {
  const { profile, metrics, visualAssets } = await getCurrentCrushProfileDetail();
  const portrait = visualAssets.find((asset) => asset.assetType === "portrait")?.storageUrl;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 sm:px-8 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-blush-200/50 backdrop-blur md:p-8">
          {portrait ? (
            <div className="absolute right-6 top-6 hidden h-36 w-28 overflow-hidden rounded-[1.5rem] border border-white bg-blush-50 shadow-xl shadow-blush-100 sm:block">
              <Image alt={`${profile?.nickname ?? "Crush"} 角色立绘`} fill src={portrait} className="object-cover" />
            </div>
          ) : (
            <div className="absolute right-6 top-6 hidden rounded-full bg-sun-100 px-4 py-2 text-sm font-bold text-ink-700 sm:block">
              Phase 0-3 Ready
            </div>
          )}
          <p className="mb-4 inline-flex rounded-full border border-blush-200 bg-blush-50 px-4 py-2 text-sm font-semibold text-blush-700">
            Crush 工作台
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-normal text-ink-900 sm:text-6xl">
            {profile?.nickname ?? "先创建你的第一个 Crush"}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink-700">
            {profile
              ? "现在已经有基础档案，可以继续接入深度建档、视觉主题、陪伴聊天和实战演练。"
              : "Phase 1 已准备好年龄确认和单 Crush 草稿。下一步会把深度建档向导接上来。"}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={profile ? "/app/practice" : "/onboarding/create"}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink-900 px-6 text-base font-bold text-white shadow-lg shadow-blush-200 transition hover:-translate-y-0.5 hover:bg-blush-700"
            >
              {profile ? "测试一句话 / 开始演练" : "创建 Crush 档案"}
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link
              href="/app/chat"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-ink-900/10 bg-white px-6 text-base font-bold text-ink-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-blush-50"
            >
              <MessageCircleHeart aria-hidden="true" size={18} />
              甜蜜陪伴
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-mint-100/70 backdrop-blur">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mint-100 text-mint-500">
                <ShieldCheck aria-hidden="true" size={22} />
              </span>
              <h2 className="text-lg font-extrabold">现实关系状态</h2>
            </div>
            <dl className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink-700">现实关系阶段</dt>
                <dd className="font-bold">{stageText(profile?.realRelationshipStage)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink-700">互动温度</dt>
                <dd className="font-bold">{profile?.interactionTemperature ?? "待分析"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink-700">风险等级</dt>
                <dd className="font-bold">{profile?.riskLevel ?? "待分析"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-sun-100/60 backdrop-blur">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sun-100 text-sun-500">
                <Sparkles aria-hidden="true" size={22} />
              </span>
              <h2 className="text-lg font-extrabold">成长指标</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="虚拟亲密度" value={metrics?.virtualIntimacy ?? 0} />
              <Metric label="沟通信心" value={metrics?.communicationConfidence ?? 0} />
              <Metric label="关系理解" value={metrics?.relationshipUnderstanding ?? 0} />
              <Metric label="情绪稳定" value={metrics?.emotionalStability ?? 0} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-blush-50/70 p-4">
      <p className="text-xs font-bold text-ink-700">{label}</p>
      <p className="mt-1 text-2xl font-black text-ink-900">{value}</p>
    </div>
  );
}
