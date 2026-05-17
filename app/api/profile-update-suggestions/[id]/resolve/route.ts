import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveCurrentSuggestion } from "@/lib/repositories";

const requestSchema = z.object({
  decision: z.enum(["accepted", "rejected"]),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "请选择接受或拒绝。" }, { status: 400 });
  }
  const { id } = await params;
  const suggestion = await resolveCurrentSuggestion(id, parsed.data.decision);
  if (!suggestion) {
    return NextResponse.json({ error: "建议不存在。" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, suggestion });
}
