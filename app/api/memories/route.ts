import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, handleApiError, notFoundResponse } from "@/lib/errors";
import { createCurrentMemory, getCurrentMemories } from "@/lib/repositories";

const requestSchema = z.object({
  sourceType: z.string().min(1),
  sourceId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(80),
  excerpt: z.string().max(500).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  rewardJson: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function GET() {
  try {
    const memories = await getCurrentMemories();
    return NextResponse.json({ memories });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse("回忆参数不正确。", parsed.error.flatten());
    }

    const memory = await createCurrentMemory(parsed.data);
    if (!memory) {
      return notFoundResponse("回忆来源不存在。");
    }
    return NextResponse.json({ memory });
  } catch (error) {
    return handleApiError(error);
  }
}
