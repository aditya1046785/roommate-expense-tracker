import { NextResponse } from "next/server";
import { getBearerToken, verifyAuthToken } from "@/lib/auth";
import { getExpensesForUser } from "@/lib/expenses";

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request);
    const session = token ? await verifyAuthToken(token) : null;
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const expenses = await getExpensesForUser(session.userId);
    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("Error in get my expenses API:", error);
    return NextResponse.json({ success: false, error: "Unable to fetch expenses" }, { status: 500 });
  }
}
