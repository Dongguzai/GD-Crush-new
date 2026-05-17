import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    text: "我有点想和你聊一会儿，但也想慢慢来。",
    provider: "mock-stt",
  });
}
