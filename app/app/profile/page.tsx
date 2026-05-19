import { getCurrentCrushProfileDetail } from "@/lib/repositories";
import Link from "next/link";

export default async function ProfilePage() {
  const {
    profile,
    traits = [],
    realityEvents = [],
    realitySignals = [],
    realityInferences = [],
  } = await getCurrentCrushProfileDetail();

  // Separate confirmed facts from inferred traits
  const confirmedFacts = traits.filter((t) => t.traitType === "fact" && t.confirmed);
  const inferredTraits = traits.filter((t) => t.traitType === "style" && t.confirmed);
  const boundaries = traits.filter((t) => t.traitType === "boundary" && t.confirmed);

  // Recent confirmed reality events
  const recentEvents = [...realityEvents].slice(-5).reverse();
  // Active signals with polarity
  const activeSignals = [...realitySignals]
    .filter((s) => s.status === "active")
    .slice(-5)
    .reverse();
  // Pending inferences with confidence
  const pendingInferences = [...realityInferences]
    .filter((i) => i.status === "pending")
    .slice(-5)
    .reverse();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-blush-200/40 backdrop-blur md:p-7">
        <p className="text-sm font-semibold text-blush-700">TA 档案</p>
        <h1 className="mt-2 font-display text-5xl font-semibold leading-none tracking-normal text-ink-900">
          {profile?.nickname ?? "尚未创建 Crush"}
        </h1>

        {/* Relationship state at a glance */}
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <InfoCard
            label="现实关系阶段"
            value={profile?.realRelationshipStage ?? "待确认"}
            tone="blush"
          />
          <InfoCard
            label="互动温度"
            value={temperatureLabel(profile?.interactionTemperature)}
            tone={profile?.interactionTemperature === "warm" ? "amber" : "slate"}
          />
          <InfoCard
            label="AI 置信度"
            value={profile?.aiConfidence ? `${Math.round(Number(profile.aiConfidence) * 100)}%` : "待积累"}
            tone="slate"
          />
        </div>

        {!profile ? (
          <div className="mt-7 rounded-3xl bg-blush-50 p-5 text-sm leading-7 text-ink-700">
            <p className="font-black text-ink-900">还没有 Crush 档案</p>
            <p>先完成建档流程，事实、推测和雷区才会在这里逐步沉淀。</p>
            <Link
              className="mt-3 inline-flex rounded-full bg-white px-4 py-2 font-bold text-ink-900"
              href="/onboarding/create"
            >
              去创建档案
            </Link>
          </div>
        ) : (
          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Left: Identity + facts + inferred traits */}
            <div className="grid gap-5">
              {/* Confirmed facts section */}
              {confirmedFacts.length > 0 && (
                <ProfileSection title="已确认事实" tone="blush">
                  {confirmedFacts.map((trait) => (
                    <TraitCard key={trait.id} trait={trait} type="fact" />
                  ))}
                </ProfileSection>
              )}

              {/* Inferred traits section */}
              {inferredTraits.length > 0 && (
                <ProfileSection title="推测特征" tone="violet" subtitle="基于你和 TA 的互动推断，需要更多现实反馈验证">
                  {inferredTraits.map((trait) => (
                    <TraitCard key={trait.id} trait={trait} type="inferred" />
                  ))}
                </ProfileSection>
              )}

              {/* Boundaries section */}
              {boundaries.length > 0 && (
                <ProfileSection title="沟通雷区" tone="rose">
                  {boundaries.map((trait) => (
                    <TraitCard key={trait.id} trait={trait} type="boundary" />
                  ))}
                </ProfileSection>
              )}

              {/* Empty state for no traits */}
              {!confirmedFacts.length && !inferredTraits.length && !boundaries.length && (
                <div className="rounded-3xl bg-blush-50 p-5 text-sm leading-7 text-ink-700">
                  <p className="font-bold text-ink-900">还没有情报</p>
                  <p className="mt-1">完成建档或在「行动」页记录反馈后，这里会逐步沉淀信息。</p>
                </div>
              )}
            </div>

            {/* Right: Reality observation layer */}
            <aside className="space-y-4">
              <RealityLayerPanel
                title="现实观察"
                description="这些是 GD 从你们真实互动中积累的信息，用来让演练更贴近现实 TA。"
                items={recentEvents}
                type="events"
              />

              {activeSignals.length > 0 && (
                <RealityLayerPanel
                  title="互动信号"
                  description="从现实事件中提取的可观察信号，标注了正负倾向和置信度。"
                  items={activeSignals}
                  type="signals"
                />
              )}

              {pendingInferences.length > 0 && (
                <RealityLayerPanel
                  title="待验证推断"
                  description="AI 基于现有信息形成的保守推断，需要更多现实反馈来验证或推翻。"
                  items={pendingInferences}
                  type="inferences"
                />
              )}

              {/* Helper tip */}
              {!recentEvents.length && !activeSignals.length && !pendingInferences.length && (
                <div className="rounded-3xl border border-blush-100 bg-white/70 p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-widest text-blush-700">现实观察</p>
                  <p className="mt-2 text-sm leading-6 text-ink-600">
                    在聊天里提到现实发生的事时，点一下旁边的「记一下」，这里就会慢慢长出来。
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function temperatureLabel(temp?: string | null) {
  if (temp === "warm") return "偏暖";
  if (temp === "cool") return "偏冷";
  return "待确认";
}

function InfoCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blush" | "mint" | "amber" | "slate" | "violet" | "rose";
}) {
  const toneClasses: Record<string, string> = {
    blush: "bg-blush-100/60",
    mint: "bg-mint-100/55",
    amber: "bg-amber-50",
    slate: "bg-slate-100/60",
    violet: "bg-violet-50",
    rose: "bg-rose-50",
  };
  const textClasses: Record<string, string> = {
    blush: "text-blush-700",
    mint: "text-mint-700",
    amber: "text-amber-700",
    slate: "text-slate-600",
    violet: "text-violet-700",
    rose: "text-rose-700",
  };

  return (
    <div className={`rounded-3xl ${toneClasses[tone]} p-5`}>
      <p className="text-xs font-medium leading-5 text-ink-700/70">{label}</p>
      <p className={`mt-2 text-2xl font-semibold leading-8 ${textClasses[tone]}`}>{value}</p>
    </div>
  );
}

type TraitType = "fact" | "inferred" | "boundary";

type TraitData = {
  id: string;
  label: string;
  description?: string | null;
  confidence?: number | null;
};

function TraitCard({
  trait,
  type,
}: {
  trait: TraitData;
  type: TraitType;
}) {
  const typeConfig: Record<TraitType, { badge: string; color: string }> = {
    fact: { badge: "事实", color: "bg-blush-100 text-blush-700 border-blush-200" },
    inferred: { badge: "推测", color: "bg-violet-100 text-violet-700 border-violet-200" },
    boundary: { badge: "雷区", color: "bg-rose-100 text-rose-700 border-rose-200" },
  };
  const config = typeConfig[type];

  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-ink-900">{trait.label}</h3>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${config.color}`}>
          {config.badge}
        </span>
      </div>
      {trait.description && (
        <p className="mt-2 text-sm leading-relaxed text-ink-600">{trait.description}</p>
      )}
      {trait.confidence != null && (
        <p className="mt-2 text-xs text-ink-400">
          置信度 {Math.round(trait.confidence * 100)}%
        </p>
      )}
    </article>
  );
}

type ProfileSectionTone = "blush" | "violet" | "rose";

function ProfileSection({
  title,
  tone,
  subtitle,
  children,
}: {
  title: string;
  tone: ProfileSectionTone;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const titleColors: Record<ProfileSectionTone, string> = {
    blush: "text-blush-700",
    violet: "text-violet-700",
    rose: "text-rose-700",
  };
  const borderColors: Record<ProfileSectionTone, string> = {
    blush: "border-blush-100",
    violet: "border-violet-100",
    rose: "border-rose-100",
  };

  return (
    <div className={`rounded-3xl border ${borderColors[tone]} bg-white/50 p-5`}>
      <div className="mb-4">
        <p className={`text-xs font-black uppercase tracking-widest ${titleColors[tone]}`}>{title}</p>
        {subtitle && <p className="mt-1 text-xs text-ink-400">{subtitle}</p>}
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

type RealityItem = {
  id: string;
  label?: string | null;
  description?: string | null;
  eventText?: string;
  occurredAtText?: string | null;
  polarity?: string | null;
  confidence?: number | null;
  eventType?: string;
  inferenceType?: string;
  signalType?: string;
};

type RealityLayerType = "events" | "signals" | "inferences";

function RealityLayerPanel({
  title,
  description,
  items,
  type,
}: {
  title: string;
  description: string;
  items: RealityItem[];
  type: RealityLayerType;
}) {
  return (
    <div className="rounded-3xl border border-blush-100 bg-white/70 p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-widest text-blush-700">{title}</p>
      <p className="mt-2 text-xs leading-5 text-ink-500">{description}</p>

      {items.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {items.map((item) => (
            <RealityItemCard key={item.id} item={item} type={type} />
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-blush-50 px-3 py-2.5 text-xs leading-5 text-ink-500">
          暂无
        </div>
      )}
    </div>
  );
}

function RealityItemCard({ item, type }: { item: RealityItem; type: RealityLayerType }) {
  if (type === "events") {
    return (
      <div className="rounded-xl border border-blush-100 bg-blush-50/60 px-3 py-2.5 text-xs leading-5 text-ink-700">
        {item.occurredAtText && (
          <span className="mr-1.5 font-bold text-blush-600">[{item.occurredAtText}]</span>
        )}
        {item.eventText}
      </div>
    );
  }

  if (type === "signals") {
    const polarity = item.polarity;
    const polarityConfig = polarity === "positive"
      ? { color: "bg-amber-50 border-amber-200 text-amber-700", badge: "暖" }
      : polarity === "negative"
        ? { color: "bg-slate-100 border-slate-200 text-slate-600", badge: "冷" }
        : { color: "bg-gray-50 border-gray-200 text-gray-600", badge: "中性" };

    return (
      <div className={`rounded-xl border px-3 py-2.5 text-xs leading-5 ${polarityConfig.color}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{item.label}</span>
          <span className="shrink-0 rounded-full border bg-white px-1.5 py-0.5 text-[10px] font-bold">
            {polarityConfig.badge}
          </span>
        </div>
        {item.description && <p className="mt-1 text-ink-600">{item.description}</p>}
        {item.confidence != null && (
          <p className="mt-1 text-ink-400">{Math.round(item.confidence * 100)}%</p>
        )}
      </div>
    );
  }

  // inferences
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5 text-xs leading-5 text-violet-700">
      <span className="font-semibold">{item.label}</span>
      {item.description && <p className="mt-1 text-violet-600">{item.description}</p>}
      {item.confidence != null && (
        <p className="mt-1 text-violet-400">置信度 {Math.round(item.confidence * 100)}%</p>
      )}
    </div>
  );
}