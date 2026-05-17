import { VisualGenerator } from "@/components/visual-generator";

export default function VisualPage() {
  return (
    <main className="min-h-screen px-5 py-8 text-ink-900 sm:px-8">
      <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="pt-4 lg:sticky lg:top-8 lg:self-start">
          <p className="mb-4 inline-flex rounded-full border border-blush-200 bg-white/70 px-4 py-2 text-sm font-semibold text-blush-700 shadow-sm">
            Onboarding 04
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
            给 TA 选择一个虚拟世界。
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-ink-700">
            选择一个主题后，系统会生成头像、立绘和基础表情差分；如果你上传参考图，原图只用于本次生成，完成后会被删除。
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-2xl shadow-blush-200/50 backdrop-blur md:p-7">
          <VisualGenerator />
        </div>
      </section>
    </main>
  );
}
