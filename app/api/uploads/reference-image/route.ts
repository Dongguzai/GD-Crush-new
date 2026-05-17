import { NextResponse } from "next/server";
import { BadRequestError, handleApiError } from "@/lib/errors";
import { addCurrentCrushMaterial } from "@/lib/repositories";
import { getStorageService } from "@/lib/storage-service";

const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new BadRequestError("请选择一张参考图。");
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new BadRequestError("参考图仅支持 JPEG、PNG 或 WebP。");
    }

    if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
      throw new BadRequestError("参考图不能超过 10MB。");
    }

    const temporaryObject = await getStorageService().saveTemporaryReferenceImage({
      bytes: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    });

    const material = await addCurrentCrushMaterial({
      materialType: "reference_image",
      storageUrl: temporaryObject.key,
    });

    return NextResponse.json({
      temporaryObjectKey: temporaryObject.key,
      materialId: material.id,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

