export default function MemoriesLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-blush-200/40 backdrop-blur">
        <p className="text-sm font-bold text-blush-700">轻量回忆册</p>
        <div className="mt-4 h-10 w-72 animate-pulse rounded-full bg-blush-50" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-3xl bg-blush-50" />
          ))}
        </div>
      </section>
    </main>
  );
}
