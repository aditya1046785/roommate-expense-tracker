import { NextResponse } from "next/server";
import { getBearerToken, verifyAuthToken } from "@/lib/auth";
import { insertSyncedExpenses } from "@/lib/expenses";
import type { ExpenseCategory, ExpenseSyncPayload } from "@/lib/types";

const CATEGORIES: ExpenseCategory[] = ["Dairy", "Vegetables", "Spices", "Other"];

function isValidExpense(expense: unknown): expense is ExpenseSyncPayload {
  if (!expense || typeof expense !== "object") return false;
  const item = expense as Record<string, unknown>;
  return typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount > 0
    && typeof item.category === "string" && CATEGORIES.includes(item.category as ExpenseCategory)
    && (item.description === undefined || typeof item.description === "string")
    && typeof item.client_local_id === "string" && item.client_local_id.length > 0
    && typeof item.timestamp === "string" && !Number.isNaN(Date.parse(item.timestamp));
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    const session = token ? await verifyAuthToken(token) : null;
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const expenses: unknown = await request.json();
    if (!Array.isArray(expenses) || !expenses.every(isValidExpense) || new Set(expenses.map((expense) => expense.client_local_id)).size !== expenses.length) {
      return NextResponse.json({ success: false, error: "Expected an array of valid expenses" }, { status: 400 });
    }

    const syncedIds = await insertSyncedExpenses(session.userId, expenses);
    return NextResponse.json({ success: true, synced_ids: syncedIds });
  } catch (error) {
    console.error("Error in expense sync API:", error);
    return NextResponse.json({ success: false, error: "Unable to sync expenses" }, { status: 500 });
  }
}
