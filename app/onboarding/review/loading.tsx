export default function ReviewLoading() {
  return (
    <main className="min-h-screen px-5 py-8 text-ink-900 sm:px-8">
      <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="pt-4">
          <div className="h-9 w-32 animate-pulse rounded-full bg-white/70" />
          <div className="mt-5 h-28 max-w-lg animate-pulse rounded-[2rem] bg-white/70" />
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-2xl shadow-blush-200/50 backdrop-blur md:p-7">
          <div className="grid gap-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-3xl bg-blush-50" />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
