import { NextResponse } from "next/server";
import { z } from "zod";
import { sendCurrentSimulationMessage } from "@/lib/repositories";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "模拟消息不正确。" }, { status: 400 });
  }
  const result = await sendCurrentSimulationMessage(parsed.data.sessionId, parsed.data.message);
  if (!result) {
    return NextResponse.json({ error: "模拟会话不存在。" }, { status: 404 });
  }
  return NextResponse.json(result);
}
