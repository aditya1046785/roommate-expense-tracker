import { NextResponse } from "next/server";
import { adminCookieName, verifyAuthToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.token !== "string") {
      return NextResponse.json({ success: false, error: "Token is required" }, { status: 400 });
    }
    const session = await verifyAuthToken(body.token);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Administrator access required" }, { status: 403 });
    }
    const response = NextResponse.json({ success: true });
    response.cookies.set(adminCookieName, body.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error("Error creating admin session:", error);
    return NextResponse.json({ success: false, error: "Unable to create admin session" }, { status: 500 });
  }
}
