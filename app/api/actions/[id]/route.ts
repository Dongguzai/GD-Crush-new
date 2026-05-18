import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, handleApiError, notFoundResponse } from "@/lib/errors";
import { updateCurrentAction } from "@/lib/repositories";

const requestSchema = z.object({
  status: z.string().min(1),
  feedbackText: z.string().max(1000).optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse("行动更新参数不正确。");
    }
    const { id } = await params;
    const result = await updateCurrentAction(id, parsed.data);
    if (!result) {
      return notFoundResponse("行动不存在。");
    }
    return NextResponse.json({
      ok: true,
      action: result.action,
      profileUpdateSuggestionId: result.suggestion.id,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
