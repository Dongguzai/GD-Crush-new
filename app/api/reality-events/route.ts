import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, handleApiError, notFoundResponse } from "@/lib/errors";
import { createCurrentRealityEvent } from "@/lib/repositories";

const requestSchema = z.object({
  sourceMessageId: z.string().uuid(),
  note: z.string().trim().max(1000).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse("现实事件参数不正确。", parsed.error.flatten());
    }

    const event = await createCurrentRealityEvent(parsed.data);
    if (!event) {
      return notFoundResponse("关联消息不存在。");
    }

    return NextResponse.json({ realityEventId: event.id, realityEvent: event });
  } catch (error) {
    return handleApiError(error);
  }
}
