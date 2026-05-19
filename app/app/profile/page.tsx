import { getCurrentCrushProfileDetail } from "@/lib/repositories";
import Link from "next/link";

export default async function ProfilePage() {
  const { profile, traits, realityEvents = [] } = await getCurrentCrushProfileDetail();
  const recentRealityEvents = [...realityEvents].slice(-5).reverse();

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
        <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="grid gap-4">
            {!profile ? (
              <div className="rounded-3xl bg-blush-50 p-5 text-sm leading-7 text-ink-700">
                <p className="font-black text-ink-900">还没有 Crush 档案</p>
                <p>先完成建档流程，事实、推测和雷区才会在这里逐步沉淀。</p>
                <Link
                  className="mt-3 inline-flex rounded-full bg-white px-4 py-2 font-bold text-ink-900"
                  href="/onboarding/create"
                >
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
              <p className="rounded-3xl bg-blush-50 p-5 text-sm leading-7 text-ink-700">
                暂无情报。完成建档或现实反馈后会出现在这里。
              </p>
            )}
          </div>

          <aside className="rounded-3xl border border-blush-100 bg-white/70 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blush-700">现实观察</p>
            <h2 className="mt-2 text-xl font-semibold leading-7 text-ink-900">最近现实事件</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              这些只记录你确认过的现实片段，用来让之后的演练更贴近真实 TA。
            </p>

            {recentRealityEvents.length ? (
              <div className="mt-4 grid gap-3">
                {recentRealityEvents.map((event) => (
                  <article key={event.id} className="rounded-2xl bg-blush-50 px-4 py-3 text-sm leading-6 text-ink-800">
                    {event.occurredAtText ? (
                      <p className="mb-1 text-[11px] font-black text-blush-700">{event.occurredAtText}</p>
                    ) : null}
                    <p>{event.eventText}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-blush-50 px-4 py-3 text-sm leading-6 text-ink-700">
                在聊天里提到现实发生的事时，点一下旁边的「记一下」，这里就会慢慢长出来。
              </div>
            )}
          </aside>
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
