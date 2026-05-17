import { NextResponse } from "next/server";
import { z } from "zod";
import { createCurrentMemory, getCurrentMemories } from "@/lib/repositories";

const requestSchema = z.object({
  sourceType: z.string().min(1),
  sourceId: z.string().optional().nullable(),
  title: z.string().min(1).max(80),
  excerpt: z.string().max(500).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  rewardJson: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function GET() {
  const memories = await getCurrentMemories();
  return NextResponse.json({ memories });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "回忆参数不正确。", issues: parsed.error.flatten() }, { status: 400 });
  }

  const memory = await createCurrentMemory(parsed.data);
  return NextResponse.json({ memory });
}
