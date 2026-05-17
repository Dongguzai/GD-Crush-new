import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/errors";
import { generateCurrentCrushSceneAsset } from "@/lib/repositories";

const requestSchema = z.object({
  theme: z.enum(["sunny_campus", "city_healing", "dream_otome"]),
  visualTags: z.record(z.string(), z.unknown()).optional(),
  sceneDescription: z.string().trim().min(4).max(240),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "场景生成参数不正确。", issues: parsed.error.flatten() }, { status: 400 });
    }

    const asset = await generateCurrentCrushSceneAsset(parsed.data);
    return NextResponse.json({ asset });
  } catch (error) {
    return handleApiError(error);
  }
}

