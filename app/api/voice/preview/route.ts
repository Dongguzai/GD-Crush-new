import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, handleApiError } from "@/lib/errors";
import { getTtsService } from "@/lib/tts-service";

const requestSchema = z.object({
  text: z.string().min(1).max(200),
  speed: z.enum(["slow", "normal", "fast"]).optional().default("normal"),
  emotionLevel: z.enum(["restrained", "natural", "sweet"]).optional().default("natural"),
  ageStyle: z.enum(["young", "mature"]).optional().default("young"),
});

// Map settings to speech rate adjustment
function mapSpeedToSpeechRate(speed: string): number {
  switch (speed) {
    case "slow":
      return -25;
    case "normal":
      return -10;
    case "fast":
      return 5;
    default:
      return -10;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse("预览参数不正确。");
    }

    // For preview, we'll use a mock response since real TTS requires storage
    // In production, this could stream audio directly
    return NextResponse.json({
      success: true,
      message: "语音预览功能需要完整 TTS 集成。当前显示设置已保存。",
      settings: {
        text: parsed.data.text,
        speed: parsed.data.speed,
        emotionLevel: parsed.data.emotionLevel,
        ageStyle: parsed.data.ageStyle,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
