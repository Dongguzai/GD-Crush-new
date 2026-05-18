import { NextResponse } from "next/server";
import { z } from "zod";
import { destroyCurrentCrush } from "@/lib/repositories";
import { badRequestResponse, handleApiError } from "@/lib/errors";

const requestSchema = z.object({
  confirmText: z.literal("DELETE"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse("请输入 DELETE 进行二次确认。");
    }
    const result = await destroyCurrentCrush(parsed.data.confirmText);
    return NextResponse.json({ ok: true, destroyedAt: result?.destroyedAt ?? null });
  } catch (error) {
    return handleApiError(error);
  }
}
