import { AgeGateForm } from "@/components/age-gate-form";

export default function AgeGatePage() {
  return (
    <main className="flex min-h-screen items-center px-5 py-8 text-ink-900">
      <section className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-blush-200 bg-white/70 px-4 py-2 text-sm font-semibold text-blush-700 shadow-sm">
            Onboarding 01
          </p>
          <h2 className="font-display text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
            温柔可以有，边界也要在。
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-ink-700">
            Phase 0/1 先把年龄确认、基础路由、用户记录和 Crush 草稿建立好。后续建档、图片、语音、演练都会接在这条线上。
          </p>
        </div>
        <AgeGateForm />
      </section>
    </main>
  );
}
