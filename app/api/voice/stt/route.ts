import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { BadRequestError, handleApiError } from "@/lib/errors";
import { getStorageService } from "@/lib/storage-service";
import { getSttService } from "@/lib/stt-service";

const requestSchema = z.object({
  audioObjectKey: z.string().startsWith("tmp/audio/"),
});

export async function POST(request: Request) {
  let audioObjectKey: string | null = null;

  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestError("语音识别参数不正确。");
    }

    audioObjectKey = parsed.data.audioObjectKey;
    const userId = await getCurrentUserId();
    const result = await getSttService().transcribe({
      audioObjectKey,
      userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  } finally {
    if (audioObjectKey) {
      await getStorageService().deleteObject(audioObjectKey).catch((error) => {
        console.warn("[STT] Failed to delete temporary audio", error);
      });
    }
  }
}
