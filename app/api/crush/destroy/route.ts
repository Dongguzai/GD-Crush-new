import { NextResponse } from "next/server";
import { z } from "zod";
import { destroyCurrentCrush } from "@/lib/repositories";

const requestSchema = z.object({
  confirmText: z.literal("DELETE"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入 DELETE 进行二次确认。" }, { status: 400 });
  }
  const profile = await destroyCurrentCrush(parsed.data.confirmText);
  return NextResponse.json({ ok: true, destroyedAt: new Date().toISOString(), profile });
}
