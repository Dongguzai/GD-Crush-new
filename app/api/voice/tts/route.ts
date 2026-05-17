import { NextResponse } from "next/server";
import { z } from "zod";
import { attachMockVoiceToMessage, getCurrentVoiceProfile } from "@/lib/repositories";

const requestSchema = z.object({
  messageId: z.string().uuid(),
  text: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "语音生成参数不正确。" }, { status: 400 });
  }

  const voice = await getCurrentVoiceProfile();
  const message = await attachMockVoiceToMessage(parsed.data.messageId);

  return NextResponse.json({
    audioUrl: message?.audioUrl ?? `/api/voice/mock?messageId=${parsed.data.messageId}`,
    voice,
    provider: "mock-tts",
  });
}
