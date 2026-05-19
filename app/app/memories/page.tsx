import { getCurrentMemories } from "@/lib/repositories";
import Link from "next/link";
import { Heart, Sparkles, Target, Star } from "lucide-react";

const sourceTypeConfig: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  chat_favorite: { label: "收藏对白", icon: Heart, color: "text-blush-500" },
  practice_chapter: { label: "演练完成", icon: Sparkles, color: "text-purple-500" },
  action_completed: { label: "行动里程碑", icon: Target, color: "text-emerald-500" },
  milestone: { label: "重要时刻", icon: Star, color: "text-amber-500" },
};

const emotionTagConfig: Record<string, { label: string; emoji: string }> = {
  warm: { label: "温暖", emoji: "☀️" },
  intimate: { label: "心动", emoji: "💕" },
  encouraging: { label: "鼓励", emoji: "🌱" },
  milestone: { label: "里程碑", emoji: "🎯" },
  gentle: { label: "温柔", emoji: "🌙" },
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;

  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export default async function MemoriesPage() {
  const memories = await getCurrentMemories();

  // Group memories by source type
  const groupedMemories = memories.reduce<Record<string, typeof memories>>((acc, memory) => {
    const sourceType = memory.sourceType || "other";
    if (!acc[sourceType]) {
      acc[sourceType] = [];
    }
    acc[sourceType].push(memory);
    return acc;
  }, {});

  // Sort groups by priority: milestone > action_completed > practice_chapter > chat_favorite
  const groupOrder = ["milestone", "action_completed", "practice_chapter", "chat_favorite"];
  const sortedGroups = groupOrder.filter((g) => groupedMemories[g]).concat(Object.keys(groupedMemories).filter((g) => !groupOrder.includes(g)));

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-6 sm:px-8 lg:py-10">
      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-blush-200/40 backdrop-blur sm:p-8">
        <header className="mb-6">
          <p className="text-sm font-bold text-blush-700">轻量回忆册</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-normal text-ink-900 sm:text-4xl">
            这些时刻值得珍藏
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            产品内虚拟回忆，不代表现实关系变化。
          </p>
        </header>

        {memories.length === 0 ? (
          <div className="rounded-3xl bg-blush-50 p-6 text-center">
            <p className="text-lg font-bold text-ink-900">暂无回忆</p>
            <p className="mt-2 text-ink-700">
              可以在聊天中收藏 Crush 的回复，系统会把它放进这里。
            </p>
            <Link
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-blush-600 px-5 py-2.5 font-bold text-white shadow-lg shadow-blush-200 transition hover:bg-blush-700"
              href="/app"
            >
              <Heart className="h-4 w-4" />
              去聊天收藏
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedGroups.map((sourceType) => {
              const config = sourceTypeConfig[sourceType] || {
                label: sourceType,
                icon: Star,
                color: "text-ink-500",
              };
              const Icon = config.icon;
              const groupMemories = groupedMemories[sourceType];

              return (
                <section key={sourceType}>
                  <div className="mb-4 flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    <h2 className="font-bold text-ink-800">{config.label}</h2>
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">
                      {groupMemories.length}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {groupMemories.map((memory) => {
                      const emotion = emotionTagConfig[memory.emotionTag ?? "warm"] || {
                        label: memory.emotionTag ?? "温暖",
                        emoji: "💫",
                      };

                      return (
                        <article
                          key={memory.id}
                          className="group relative overflow-hidden rounded-2xl border border-blush-100 bg-gradient-to-br from-white to-blush-50 p-5 shadow-sm transition-shadow hover:shadow-md"
                        >
                          {/* Importance indicator */}
                          {memory.importanceLevel >= 3 && (
                            <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-amber-100">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                            </div>
                          )}

                          {/* Scene image (if available) */}
                          {memory.imageUrl && (
                            <div className="mb-3 -mx-5 -mt-5 overflow-hidden rounded-t-2xl">
                              <img
                                src={memory.imageUrl}
                                alt={memory.title}
                                className="h-36 w-full object-cover transition-transform group-hover:scale-105"
                              />
                            </div>
                          )}

                          {/* Source type badge */}
                          <div className="mb-3 flex items-center gap-2">
                            <span className="rounded-full bg-blush-100 px-2 py-0.5 text-xs font-medium text-blush-700">
                              {emotion.emoji} {emotion.label}
                            </span>
                            <span className="text-xs text-ink-400">{formatDate(memory.createdAt as unknown as string)}</span>
                          </div>

                          {/* Title */}
                          <p className="mb-2 pr-6 font-bold text-ink-900 line-clamp-1">
                            {memory.title}
                          </p>

                          {/* Excerpt */}
                          {memory.excerpt && (
                            <p className="line-clamp-3 text-sm leading-relaxed text-ink-700">
                              {memory.excerpt}
                            </p>
                          )}

                          {/* Decorative corner */}
                          <div className="absolute bottom-0 right-0 h-16 w-16 -translate-x-4 translate-y-4 rounded-full bg-blush-100/50 blur-2xl" />
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        {memories.length > 0 && (
          <p className="mt-8 border-t border-blush-100 pt-6 text-center text-xs text-ink-400">
            回忆册记录产品内虚拟互动，不代表现实关系进展。
          </p>
        )}
      </section>
    </main>
  );
}