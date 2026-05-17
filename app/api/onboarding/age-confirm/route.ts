import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmCurrentUserAge } from "@/lib/repositories";

const requestSchema = z.object({
  confirmed: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "请先确认你已年满 18 岁并理解产品用途。" },
        { status: 400 },
      );
    }

    const user = await confirmCurrentUserAge();

    return NextResponse.json({
      ok: true,
      ageConfirmedAt: user.ageConfirmedAt,
    });
  } catch (error) {
    console.error("[onboarding/age-confirm] failed to confirm age", error);

    return NextResponse.json(
      { error: "确认失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
