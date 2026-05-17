import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/errors";
import { attachVoiceToMessage, getCurrentVoiceProfile } from "@/lib/repositories";

const requestSchema = z.object({
  messageId: z.string().uuid(),
  text: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "语音生成参数不正确。" }, { status: 400 });
    }

    const voice = await getCurrentVoiceProfile();
    const result = await attachVoiceToMessage({
      messageId: parsed.data.messageId,
      text: parsed.data.text,
      speaker: voice?.providerVoiceId,
    });

    return NextResponse.json({
      audioUrl: result.message?.audioUrl ?? `/api/voice/mock?messageId=${parsed.data.messageId}`,
      voice,
      provider: result.provider,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
