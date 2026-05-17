import { NextResponse } from "next/server";
import { z } from "zod";
import { addCurrentCrushMaterial } from "@/lib/repositories";

const requestSchema = z.object({
  contentType: z.string().startsWith("image/"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "只允许上传图片参考。" }, { status: 400 });
  }

  const temporaryObjectKey = `tmp/reference/${crypto.randomUUID()}`;
  const material = await addCurrentCrushMaterial({
    materialType: "reference_image",
    storageUrl: temporaryObjectKey,
  });

  return NextResponse.json({
    uploadUrl: `/api/uploads/mock/${temporaryObjectKey}`,
    temporaryObjectKey,
    materialId: material.id,
  });
}
