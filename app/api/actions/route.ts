import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, handleApiError, notFoundResponse } from "@/lib/errors";
import { createCurrentAction, getCurrentHydratedActions, getCurrentSuggestions } from "@/lib/repositories";
import { trackAction } from "@/lib/analytics";

const requestSchema = z.object({
  practiceRunId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(80),
  suggestedMessage: z.string().max(1000).optional().nullable(),
});

export async function GET() {
  try {
    const [hydratedActions, suggestions] = await Promise.all([
      getCurrentHydratedActions(),
      getCurrentSuggestions(),
    ]);
    return NextResponse.json({ actions: hydratedActions, suggestions });
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

    // M6.4: Track action created
    trackAction("created");

    return NextResponse.json({ actionId: action.id, action });
  } catch (error) {
    return handleApiError(error);
  }
}
