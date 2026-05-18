import { NextResponse } from "next/server";
import { internalErrorResponse } from "@/lib/errors";
import { analyzeCurrentCrushProfile } from "@/lib/repositories";

export async function POST() {
  try {
    const draft = await analyzeCurrentCrushProfile();
    return NextResponse.json({
      draftId: draft.id,
      facts: draft.factsJson,
      inferredTraits: draft.inferredTraitsJson,
      boundaries: draft.boundariesJson,
      recommendedStage: draft.recommendedStage,
      interactionTemperature: draft.interactionTemperature,
      confidence: draft.confidence,
    });
  } catch (error) {
    console.error("[onboarding/analyze] failed to generate draft", error);

    return internalErrorResponse(
      "AI 建档草稿生成失败，请稍后重试。",
      error instanceof Error ? error.message : undefined,
    );
  }
}
