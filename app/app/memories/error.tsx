"use client";

import { StatePanel } from "@/components/state-panel";

export default function MemoriesError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <StatePanel
        tone="error"
        title="回忆册暂时没加载出来"
        description="已保存的回忆不会因此丢失，重新加载后再看一次。"
        actionLabel="重新加载"
        onAction={reset}
      />
    </main>
  );
}
