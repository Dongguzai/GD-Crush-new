import Link from "next/link";
import { DraftReview } from "@/components/draft-review";
import { getProfileDraftById } from "@/lib/repositories";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ draftId?: string }>;
}) {
  const params = await searchParams;
  const draft = params.draftId ? await getProfileDraftById(params.draftId) : null;

  return (
    <main className="min-h-screen px-5 py-8 text-ink-900 sm:px-8">
      <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="pt-4 lg:sticky lg:top-8 lg:self-start">
          <p className="mb-4 inline-flex rounded-full border border-blush-200 bg-white/70 px-4 py-2 text-sm font-semibold text-blush-700 shadow-sm">
            Onboarding 03
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
            AI 先给草稿，最终由你确认。
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-ink-700">
            这里把事实、推测、雷区分开显示。确认后才会写入正式情报卡，避免 AI 替你过度判断现实关系。
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-2xl shadow-blush-200/50 backdrop-blur md:p-7">
          {draft ? (
            <DraftReview draft={draft} />
          ) : (
            <div>
              <h2 className="text-xl font-extrabold">没有找到建档草稿</h2>
              <p className="mt-2 text-ink-700">请回到创建流程重新生成。</p>
              <Link className="mt-5 inline-flex rounded-full bg-ink-900 px-5 py-3 font-bold text-white" href="/onboarding/create">
                返回创建
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
