import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, internalErrorResponse, notFoundResponse } from "@/lib/errors";
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
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse("草稿确认参数不正确。", parsed.error.flatten());
    }

    const result = await confirmCurrentDraft(parsed.data.draftId, parsed.data);

    if (!result) {
      return notFoundResponse("找不到待确认的建档草稿。");
    }

    return NextResponse.json({ ok: true, profile: result.profile });
  } catch (error) {
    console.error("[onboarding/confirm-draft] failed to confirm draft", error);

    return internalErrorResponse(
      "草稿确认失败，请稍后重试。",
      error instanceof Error ? error.message : undefined,
    );
  }
}
