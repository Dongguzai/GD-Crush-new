import { NextResponse } from "next/server";
import { z } from "zod";
import { startCurrentSimulation } from "@/lib/repositories";

const requestSchema = z.object({
  scenarioType: z.string().min(1),
  goal: z.string().min(1),
  background: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "模拟参数不正确。" }, { status: 400 });
  }
  const session = await startCurrentSimulation(parsed.data);
  return NextResponse.json({ sessionId: session.id });
}
