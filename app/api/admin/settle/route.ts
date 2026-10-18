import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { settleUnsettledExpenses } from "@/lib/expenses";

export async function POST() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const transfers = await settleUnsettledExpenses();
    return NextResponse.json({ success: true, transfers });
  } catch (error) {
    console.error("Error in settle expenses API:", error);
    return NextResponse.json({ success: false, error: "Unable to settle expenses" }, { status: 500 });
  }
}
