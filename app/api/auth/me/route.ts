import { NextResponse } from "next/server";
import { isAuthenticated, getCurrentUserEmail, getCurrentUserId } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const authenticated = await isAuthenticated();
    const email = await getCurrentUserEmail();
    const userId = await getCurrentUserId();

    return NextResponse.json({
      isAuthenticated: authenticated,
      email,
      userId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
