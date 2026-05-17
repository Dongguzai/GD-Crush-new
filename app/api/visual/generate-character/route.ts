import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCurrentCrushVisualAssets } from "@/lib/repositories";

const requestSchema = z.object({
  theme: z.enum(["sunny_campus", "city_healing", "dream_otome"]),
  visualTags: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "角色生成参数不正确。", issues: parsed.error.flatten() }, { status: 400 });
  }

  const assets = await generateCurrentCrushVisualAssets(parsed.data);
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
    referenceImageDeleted: true,
  });
}
