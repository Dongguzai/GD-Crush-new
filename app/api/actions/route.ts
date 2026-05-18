import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, handleApiError, notFoundResponse } from "@/lib/errors";
import { createCurrentAction, getCurrentActionsAndSuggestions } from "@/lib/repositories";

const requestSchema = z.object({
  practiceRunId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(80),
  suggestedMessage: z.string().max(1000).optional().nullable(),
});

export async function GET() {
  try {
    return NextResponse.json(await getCurrentActionsAndSuggestions());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse("行动参数不正确。", parsed.error.flatten());
    }
    const action = await createCurrentAction(parsed.data);
    if (!action) {
      return notFoundResponse("关联演练不存在。");
    }
    return NextResponse.json({ actionId: action.id, action });
  } catch (error) {
    return handleApiError(error);
  }
}
