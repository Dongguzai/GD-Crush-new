import { getCurrentCrushProfileDetail } from "@/lib/repositories";
import Link from "next/link";

export default async function ProfilePage() {
  const { profile, traits } = await getCurrentCrushProfileDetail();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-blush-200/40 backdrop-blur md:p-7">
        <p className="text-sm font-semibold text-blush-700">TA 档案</p>
        <h1 className="mt-2 font-display text-5xl font-semibold leading-none tracking-normal text-ink-900">
          {profile?.nickname ?? "尚未创建 Crush"}
        </h1>
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          <Info label="现实关系阶段" value={profile?.realRelationshipStage ?? "待确认"} />
          <Info label="互动温度" value={profile?.interactionTemperature ?? "待确认"} />
          <Info label="AI 置信度" value={profile?.aiConfidence ? `${Number(profile.aiConfidence) * 100}%` : "待积累"} />
        </div>
        <div className="mt-7 grid gap-4">
          {!profile ? (
            <div className="rounded-3xl bg-blush-50 p-5 text-sm leading-7 text-ink-700">
              <p className="font-black text-ink-900">还没有 Crush 档案</p>
              <p>先完成建档流程，事实、推测和雷区才会在这里逐步沉淀。</p>
              <Link className="mt-3 inline-flex rounded-full bg-white px-4 py-2 font-bold text-ink-900" href="/onboarding/create">
                去创建档案
              </Link>
            </div>
          ) : traits.length ? (
            traits.map((trait) => (
              <article key={trait.id} className="rounded-3xl bg-blush-50 p-5 md:p-6">
                <h2 className="text-lg font-semibold leading-7 text-ink-900">{trait.label}</h2>
                <p className="mt-2 text-sm leading-7 text-ink-700">{trait.description}</p>
                <p className="mt-3 text-xs font-medium leading-5 text-ink-700/75">
                  <span className="uppercase">{trait.traitType}</span>
                  <span className="px-2">·</span>
                  {trait.confirmed ? "已确认" : "待确认"}
                  {typeof trait.confidence === "number" ? (
                    <>
                      <span className="px-2">·</span>
                      置信度 {Math.round(trait.confidence * 100)}%
                    </>
                  ) : null}
                </p>
              </article>
            ))
          ) : (
            <p className="rounded-3xl bg-blush-50 p-5 text-sm leading-7 text-ink-700">暂无情报。完成建档或现实反馈后会出现在这里。</p>
          )}
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-mint-100/55 p-5">
      <p className="text-xs font-medium leading-5 text-ink-700/80">{label}</p>
      <p className="mt-2 text-2xl font-semibold leading-8 text-ink-900">{value}</p>
    </div>
  );
}
