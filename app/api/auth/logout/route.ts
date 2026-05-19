import { NextResponse } from "next/server";
import { logoutUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";

export async function POST() {
  try {
    await logoutUser();

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
