import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, internalErrorResponse } from "@/lib/errors";
import { addCurrentCrushMaterial } from "@/lib/repositories";

const requestSchema = z.object({
  materialType: z.enum(["user_text", "pasted_chat", "event_note", "reference_image"]),
  sanitizedText: z.string().trim().max(8000).optional().nullable(),
  storageUrl: z.string().trim().max(1000).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse("材料格式不正确。", parsed.error.flatten());
    }

    const material = await addCurrentCrushMaterial(parsed.data);
    return NextResponse.json({ materialId: material.id, material });
  } catch (error) {
    console.error("[onboarding/materials] failed to save material", error);

    return internalErrorResponse(
      "材料保存失败，请稍后重试。",
      error instanceof Error ? error.message : undefined,
    );
  }
}
