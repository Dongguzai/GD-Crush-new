import Link from "next/link";
import { BookHeart, CheckSquare, ClipboardList, Home, MessageCircleHeart, Settings, Sparkles } from "lucide-react";

const navItems = [
  { href: "/app", label: "工作台", icon: Home },
  { href: "/app/chat", label: "聊天", icon: MessageCircleHeart },
  { href: "/app/practice", label: "演练", icon: ClipboardList },
  { href: "/app/actions", label: "行动", icon: CheckSquare },
  { href: "/app/profile", label: "情报", icon: Sparkles },
  { href: "/app/memories", label: "回忆", icon: BookHeart },
  { href: "/app/settings", label: "设置", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-ink-900">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-24 border-r border-white/70 bg-white/65 px-3 py-5 shadow-xl shadow-blush-100/60 backdrop-blur-xl lg:block">
        <Link
          href="/app"
          className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-3xl bg-ink-900 text-white shadow-lg shadow-blush-200"
          aria-label="GD Crush 工作台"
        >
          GD
        </Link>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center gap-1 rounded-3xl px-2 py-3 text-xs font-bold text-ink-700 transition hover:bg-white hover:text-blush-700 hover:shadow-sm"
            >
              <item.icon aria-hidden="true" size={21} strokeWidth={2.2} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="pb-24 lg:pl-24">
        {children}
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-[1.75rem] border border-white/80 bg-white/85 p-2 shadow-2xl shadow-blush-200/70 backdrop-blur-xl lg:hidden">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold text-ink-700 transition hover:bg-blush-50 hover:text-blush-700"
          >
            <item.icon aria-hidden="true" size={20} strokeWidth={2.2} />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
