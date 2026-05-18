import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors";
import { getCurrentCrushProfileDetail } from "@/lib/repositories";

export async function GET() {
  try {
    return NextResponse.json(await getCurrentCrushProfileDetail());
  } catch (error) {
    return handleApiError(error);
  }
}
