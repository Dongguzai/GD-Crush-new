import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, handleApiError, notFoundResponse } from "@/lib/errors";
import { resolveCurrentSuggestion } from "@/lib/repositories";

const requestSchema = z.object({
  decision: z.enum(["accepted", "rejected"]),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse("请选择接受或拒绝。");
    }
    const { id } = await params;
    const suggestion = await resolveCurrentSuggestion(id, parsed.data.decision);
    if (!suggestion) {
      return notFoundResponse("建议不存在。");
    }
    return NextResponse.json({ ok: true, suggestion });
  } catch (error) {
    return handleApiError(error);
  }
}
