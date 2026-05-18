import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, handleApiError } from "@/lib/errors";
import { getVisualTagService } from "@/lib/visual-tag-service";

const requestSchema = z.object({
  temporaryObjectKey: z.string().startsWith("tmp/reference/"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse("缺少参考图临时对象。");
    }

    const result = await getVisualTagService().extractFromTemporaryObject(parsed.data.temporaryObjectKey);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
