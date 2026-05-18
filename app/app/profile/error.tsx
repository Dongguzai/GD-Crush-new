"use client";

import { StatePanel } from "@/components/state-panel";

export default function ProfileError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <StatePanel
        tone="error"
        title="档案页暂时没加载出来"
        description="请稍后再试；如果刚完成建档，重新加载通常就会恢复。"
        actionLabel="重新加载"
        onAction={reset}
      />
    </main>
  );
}
