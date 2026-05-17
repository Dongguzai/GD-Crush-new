import { getCurrentMemories } from "@/lib/repositories";

export default async function MemoriesPage() {
  const memories = await getCurrentMemories();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-blush-200/40 backdrop-blur">
        <p className="text-sm font-bold text-blush-700">轻量回忆册</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-normal text-ink-900">
          产品内虚拟回忆，不代表现实关系变化。
        </h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {memories.length ? (
            memories.map((memory) => (
              <article key={memory.id} className="rounded-3xl bg-blush-50 p-5 text-sm leading-7">
                <p className="font-black text-ink-900">{memory.title}</p>
                <p>{memory.excerpt}</p>
                <p className="font-bold text-ink-700">{memory.sourceType}</p>
              </article>
            ))
          ) : (
            <p className="rounded-3xl bg-blush-50 p-5 text-ink-700">暂无回忆。可以在聊天中收藏一段 Crush 回复。</p>
          )}
        </div>
      </section>
    </main>
  );
}
