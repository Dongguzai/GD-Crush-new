import { getCurrentMemories } from "@/lib/repositories";
import Image from "next/image";
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
  type Memory = (typeof memories)[number];

  // Group memories by source type
  const groupedMemories = memories.reduce<Record<string, Memory[]>>((acc, memory) => {
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
    <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-6 lg:py-10">
      <section className="rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-2xl shadow-blush-200/40 backdrop-blur sm:rounded-[2rem] sm:p-6 sm:p-8">
        <header className="mb-5 sm:mb-6">
          <p className="text-xs font-bold text-blush-700 sm:text-sm">轻量回忆册</p>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-normal text-ink-900 sm:mt-2 sm:text-3xl sm:text-4xl">
            这些时刻值得珍藏
          </h1>
          <p className="mt-1 text-[10px] text-ink-600 sm:mt-2 sm:text-sm">
            产品内虚拟回忆，不代表现实关系变化。
          </p>
        </header>

        {memories.length === 0 ? (
          <div className="rounded-2xl bg-blush-50 p-5 text-center sm:rounded-3xl sm:p-6">
            <p className="text-base font-bold text-ink-900 sm:text-lg">暂无回忆</p>
            <p className="mt-1.5 text-sm text-ink-700">
              可以在聊天中收藏 Crush 的回复，系统会把它放进这里。
            </p>
            <Link
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blush-600 px-4 py-2 font-bold text-white shadow-lg shadow-blush-200 transition hover:bg-blush-700 sm:mt-4 sm:px-5 sm:py-2.5"
              href="/app"
            >
              <Heart className="h-4 w-4" />
              去聊天收藏
            </Link>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
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
                  <div className="mb-3 flex items-center gap-2 sm:mb-4">
                    <Icon className={`h-4 w-4 ${config.color} sm:h-5 sm:w-5`} />
                    <h2 className="text-sm font-bold text-ink-800 sm:text-base">{config.label}</h2>
                    <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-600 sm:px-2 sm:py-0.5 sm:text-xs">
                      {groupMemories.length}
                    </span>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                    {groupMemories.map((memory) => {
                      const emotion = emotionTagConfig[memory.emotionTag ?? "warm"] || {
                        label: memory.emotionTag ?? "温暖",
                        emoji: "💫",
                      };

                      return (
                        <article
                          key={memory.id}
                          className="group relative overflow-hidden rounded-xl border border-blush-100 bg-gradient-to-br from-white to-blush-50 p-4 shadow-sm transition-shadow hover:shadow-md sm:rounded-2xl sm:p-5"
                        >
                          {/* Importance indicator */}
                          {memory.importanceLevel >= 3 && (
                            <div className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 sm:right-3 sm:top-3 sm:h-6 sm:w-6">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-500 sm:h-3.5 sm:w-3.5" />
                            </div>
                          )}

                          {/* Scene image (if available) */}
                          {memory.imageUrl && (
                            <div className="mb-2.5 -mx-4 -mt-4 overflow-hidden rounded-t-xl sm:-mx-5 sm:-mt-5 sm:rounded-t-2xl">
                              <Image
                                src={memory.imageUrl}
                                alt={memory.title}
                                width={640}
                                height={360}
                                unoptimized
                                className="h-28 w-full object-cover transition-transform group-hover:scale-105 sm:h-36"
                              />
                            </div>
                          )}

                          {/* Source type badge */}
                          <div className="mb-2 flex items-center gap-2 sm:mb-3">
                            <span className="rounded-full bg-blush-100 px-1.5 py-0.5 text-[10px] font-medium text-blush-700 sm:px-2 sm:py-0.5 sm:text-xs">
                              {emotion.emoji} {emotion.label}
                            </span>
                            <span className="text-[10px] text-ink-400 sm:text-xs">{formatDate(memory.createdAt as unknown as string)}</span>
                          </div>

                          {/* Title */}
                          <p className="mb-1.5 pr-5 font-bold text-ink-900 line-clamp-1 sm:mb-2 sm:pr-6">
                            {memory.title}
                          </p>

                          {/* Excerpt */}
                          {memory.excerpt && (
                            <p className="line-clamp-2 text-xs leading-relaxed text-ink-700 sm:line-clamp-3 sm:text-sm">
                              {memory.excerpt}
                            </p>
                          )}

                          {/* Decorative corner */}
                          <div className="absolute bottom-0 right-0 h-12 w-12 -translate-x-3 translate-y-3 rounded-full bg-blush-100/50 blur-2xl sm:h-16 sm:w-16" />
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
          <p className="mt-6 border-t border-blush-100 pt-5 text-center text-[10px] text-ink-400 sm:mt-8 sm:pt-6 sm:text-xs">
            回忆册记录产品内虚拟互动，不代表现实关系进展。
          </p>
        )}
      </section>
    </main>
  );
}
