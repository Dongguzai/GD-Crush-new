import { NextResponse } from "next/server";
import { z } from "zod";
import { createCurrentAction, getCurrentActionsAndSuggestions } from "@/lib/repositories";

const requestSchema = z.object({
  practiceRunId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(80),
  suggestedMessage: z.string().max(1000).optional().nullable(),
});

export async function GET() {
  return NextResponse.json(await getCurrentActionsAndSuggestions());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "行动参数不正确。", issues: parsed.error.flatten() }, { status: 400 });
  }
  const action = await createCurrentAction(parsed.data);
  return NextResponse.json({ actionId: action.id, action });
}
