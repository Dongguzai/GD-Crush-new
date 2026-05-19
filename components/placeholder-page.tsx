import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-4xl items-center px-5 py-8 sm:px-8">
      <section className="w-full rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-blush-200/50 backdrop-blur md:p-8">
        <p className="mb-4 inline-flex rounded-full border border-blush-200 bg-blush-50 px-4 py-2 text-sm font-semibold text-blush-700">
          {eyebrow}
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-normal text-ink-900 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-ink-700">{description}</p>
        <Link
          href="/app"
          className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink-900/10 bg-white px-5 text-sm font-bold text-ink-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-blush-50"
        >
          <ArrowLeft aria-hidden="true" size={17} />
          回到聊天
        </Link>
      </section>
    </main>
  );
}
