export default function ProfileLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-blush-200/40 backdrop-blur md:p-7">
        <p className="text-sm font-semibold text-blush-700">情报卡 / 档案页</p>
        <div className="mt-4 h-12 w-56 animate-pulse rounded-full bg-blush-50" />
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-3xl bg-mint-100/55" />
          ))}
        </div>
        <div className="mt-7 grid gap-4">
          {[0, 1].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-3xl bg-blush-50" />
          ))}
        </div>
      </section>
    </main>
  );
}
