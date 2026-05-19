import { NextResponse } from "next/server";
import { z } from "zod";
import { loginUser, getCurrentUserId, migrateAnonymousToAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Get current anonymous user (for migration)
    const anonymousUserId = await getCurrentUserId();

    const result = await loginUser(email, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    // Note: migrateAnonymousToAuthenticated would be called here in production
    // when we have the new userId from login

    return NextResponse.json({
      success: true,
      message: "Logged in successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
