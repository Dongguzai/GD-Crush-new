import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { deleteStoredObjectWithRetry } from "@/lib/asset-lifecycle";
import { BadRequestError, handleApiError, ServiceUnavailableError } from "@/lib/errors";
import { getStorageService } from "@/lib/storage-service";
import { getSttService } from "@/lib/stt-service";

const requestSchema = z.object({
  audioObjectKey: z.string().startsWith("tmp/audio/"),
});

export async function POST(request: Request) {
  let audioObjectKey: string | null = null;
  let audioDeleted = false;

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
    await deleteStoredObjectWithRetry(getStorageService(), audioObjectKey).catch((error) => {
      throw new ServiceUnavailableError(
        "临时录音清理未完成，请稍后重试。",
        error instanceof Error ? error.message : undefined,
      );
    });
    audioDeleted = true;

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  } finally {
    if (audioObjectKey && !audioDeleted) {
      await deleteStoredObjectWithRetry(getStorageService(), audioObjectKey).catch((error) => {
        console.warn("[STT] Failed to delete temporary audio", error);
      });
    }
  }
}
