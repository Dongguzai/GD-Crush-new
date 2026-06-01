import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUser, getCurrentUserId } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";

const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Get current user ID (might be anonymous) for in-place upgrade
    const currentUserId = await getCurrentUserId();

    // Register user - this upgrades the existing anonymous user if currentUserId exists
    const result = await registerUser(email, password, currentUserId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: result.userId,
      message: "Account created successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
