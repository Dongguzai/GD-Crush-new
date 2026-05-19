import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, unauthorizedResponse } from "@/lib/errors";
import { getCurrentUserId, getOrCreateUserSettings, updateUserSettings } from "@/lib/repositories";

const updateSchema = z.object({
  autoPlayCompanionVoice: z.boolean().optional(),
  voiceSpeed: z.enum(["slow", "normal", "fast"]).optional(),
  voiceEmotionLevel: z.enum(["restrained", "natural", "sweet"]).optional(),
  voiceAgeStyle: z.enum(["young", "mature"]).optional(),
});

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const settings = await getOrCreateUserSettings(userId);
    return NextResponse.json({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid settings", details: parsed.error.flatten() }, { status: 400 });
    }

    const settings = await updateUserSettings(userId, parsed.data);
    return NextResponse.json({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}
