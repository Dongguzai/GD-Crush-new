import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, handleApiError } from "@/lib/errors";
import { generateCurrentCrushVisualAssets } from "@/lib/repositories";

const requestSchema = z.object({
  theme: z.enum(["sunny_campus", "city_healing", "dream_otome"]),
  visualTags: z.record(z.string(), z.unknown()).default({}),
  referenceImageKey: z.string().startsWith("tmp/reference/").optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse("角色生成参数不正确。", parsed.error.flatten());
    }

    const { assets, referenceImageDeleted } = await generateCurrentCrushVisualAssets(parsed.data);
    const byType = Object.fromEntries(
      assets.map((asset) => [asset.expression ?? asset.assetType, asset.storageUrl]),
    );

    return NextResponse.json({
      assets: {
        avatarUrl: byType.avatar,
        portraitUrl: byType.portrait,
        neutralUrl: byType.neutral,
        happyUrl: byType.happy,
        shyUrl: byType.shy,
      },
      referenceImageDeleted,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
