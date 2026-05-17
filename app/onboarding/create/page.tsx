import { CreateCrushForm } from "@/components/create-crush-form";

export default function CreateCrushPage() {
  return (
    <main className="min-h-screen px-5 py-8 text-ink-900 sm:px-8">
      <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="pt-4 lg:sticky lg:top-8 lg:self-start">
          <p className="mb-4 inline-flex rounded-full border border-blush-200 bg-white/70 px-4 py-2 text-sm font-semibold text-blush-700 shadow-sm">
            Onboarding 02
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
            先理解 TA，再生成那个虚拟世界。
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-ink-700">
            这里会收集关系背景、目标、焦虑、事件记录和脱敏聊天文本。AI 只生成待确认草稿，不会把推测直接写入正式档案。
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-2xl shadow-blush-200/50 backdrop-blur md:p-7">
          <CreateCrushForm />
        </div>
      </section>
    </main>
  );
}
