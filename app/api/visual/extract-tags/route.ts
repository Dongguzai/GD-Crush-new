import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  temporaryObjectKey: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "缺少参考图临时对象。" }, { status: 400 });
  }

  return NextResponse.json({
    visualTags: {
      hairStyle: "柔和短发",
      hairColor: "深棕",
      outfitMood: "清爽、干净、轻校园感",
      overallVibe: "温柔但不黏人",
      expressionMood: "平静、稍微害羞",
      ageImpressionRange: "青年",
      unsafeOrSensitiveElements: [],
    },
  });
}
