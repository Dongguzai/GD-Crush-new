import { NextResponse } from "next/server";
import { analyzeCurrentCrushProfile } from "@/lib/repositories";

export async function POST() {
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
}
