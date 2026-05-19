import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen px-5 py-8 text-ink-900 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-center gap-8">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex rounded-full border border-blush-200 bg-white/70 px-4 py-2 text-sm font-semibold text-blush-700 shadow-sm">
            GD Crush MVP
          </p>
          <h1 className="font-display text-5xl font-semibold leading-tight tracking-normal text-ink-900 sm:text-7xl">
            让 TA 先在这里等你。
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-700">
            创建你心中的 TA，和 TA 持续聊天；当你需要面对现实里的那个人时，再把想说的话先在这里演一遍。
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/onboarding/age-gate"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink-900 px-6 text-base font-bold text-white shadow-lg shadow-blush-200 transition hover:-translate-y-0.5 hover:bg-blush-700"
          >
            开始创建 Crush
          </Link>
          <Link
            href="/app"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink-900/10 bg-white/70 px-6 text-base font-bold text-ink-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
          >
            回到 TA 身边
          </Link>
        </div>
      </section>
    </main>
  );
}
