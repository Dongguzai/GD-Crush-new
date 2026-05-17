import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  contentType: z.string().startsWith("image/"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "只允许上传图片参考。" }, { status: 400 });
  }

  return NextResponse.json({
    uploadUrl: "/api/uploads/reference-image",
    uploadMethod: "POST",
    fieldName: "file",
  });
}
