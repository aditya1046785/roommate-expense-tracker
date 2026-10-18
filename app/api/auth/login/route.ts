import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAuthToken } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { UserRow } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 });
    }

    const { data, error } = await getSupabaseClient()
      .from("users")
      .select("id, name, email, password_hash, role, created_at")
      .eq("email", body.email.trim().toLowerCase())
      .maybeSingle();
    if (error) throw error;
    const user = data as UserRow | null;
    if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createAuthToken({ userId: user.id, role: user.role });
    const response = NextResponse.json({ success: true, token, user: { id: user.id, name: user.name, role: user.role } });
    if (user.role === "admin") {
      response.cookies.set("roommate_admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    return response;
  } catch (error) {
    console.error("Error in login API:", error);
    return NextResponse.json({ success: false, error: "Unable to log in" }, { status: 500 });
  }
}
