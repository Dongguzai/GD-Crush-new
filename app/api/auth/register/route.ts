import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUser, getCurrentUserId, migrateAnonymousToAuthenticated } from "@/lib/auth";
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

    // Get current anonymous user (for migration)
    const anonymousUserId = await getCurrentUserId();

    const result = await registerUser(email, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Migrate anonymous user data if exists
    if (anonymousUserId && result.userId) {
      await migrateAnonymousToAuthenticated(anonymousUserId, result.userId);
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
