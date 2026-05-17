import { NextResponse } from "next/server";
import { getCurrentCrushProfileDetail } from "@/lib/repositories";

export async function GET() {
  return NextResponse.json(await getCurrentCrushProfileDetail());
}
