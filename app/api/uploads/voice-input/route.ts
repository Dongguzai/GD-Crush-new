import { NextResponse } from "next/server";
import { BadRequestError, handleApiError } from "@/lib/errors";
import { getStorageService } from "@/lib/storage-service";

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new BadRequestError("请选择一段录音。");
    }

    if (!ALLOWED_AUDIO_TYPES.has(file.type)) {
      throw new BadRequestError("录音仅支持 WAV、MP3 或 OGG。");
    }

    if (file.size === 0) {
      throw new BadRequestError("录音为空，请重新录制。");
    }

    if (file.size > MAX_AUDIO_BYTES) {
      throw new BadRequestError("录音不能超过 20MB。");
    }

    const temporaryObject = await getStorageService().saveTemporaryAudio({
      bytes: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    });

    return NextResponse.json({
      temporaryObjectKey: temporaryObject.key,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
