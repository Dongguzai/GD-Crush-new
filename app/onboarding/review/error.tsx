"use client";

import Link from "next/link";
import { StatePanel } from "@/components/state-panel";

export default function ReviewError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen px-5 py-8 text-ink-900 sm:px-8">
      <section className="mx-auto w-full max-w-3xl">
        <StatePanel
          tone="error"
          title="建档草稿暂时没加载出来"
          description="你可以先重试；如果草稿已经失效，就回到创建流程重新生成。"
          actionLabel="重新加载"
          onAction={reset}
        />
        <Link className="mt-4 inline-flex rounded-full bg-ink-900 px-5 py-3 font-bold text-white" href="/onboarding/create">
          返回创建
        </Link>
      </section>
    </main>
  );
}
