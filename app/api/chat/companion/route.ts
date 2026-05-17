import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentCompanionChat, sendCurrentCompanionMessage } from "@/lib/repositories";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  inputMode: z.enum(["text", "voice"]).default("text"),
});

export async function GET() {
  const chat = await getCurrentCompanionChat();
  return NextResponse.json(chat);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "消息不能为空。", issues: parsed.error.flatten() }, { status: 400 });
  }

  const result = await sendCurrentCompanionMessage(parsed.data.message);
  return NextResponse.json(result);
}
