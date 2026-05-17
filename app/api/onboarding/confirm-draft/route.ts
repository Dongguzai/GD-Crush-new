import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmCurrentDraft } from "@/lib/repositories";

const requestSchema = z.object({
  draftId: z.string().uuid(),
  acceptedFacts: z.array(z.object({ label: z.string(), value: z.string().optional() })).optional(),
  acceptedTraits: z
    .array(z.object({ label: z.string(), value: z.string().optional(), confidence: z.number().optional() }))
    .optional(),
  realRelationshipStage: z.string().optional(),
  interactionTemperature: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "草稿确认参数不正确。", issues: parsed.error.flatten() }, { status: 400 });
  }

  const result = await confirmCurrentDraft(parsed.data.draftId, parsed.data);

  if (!result) {
    return NextResponse.json({ error: "找不到待确认的建档草稿。" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, profile: result.profile });
}
