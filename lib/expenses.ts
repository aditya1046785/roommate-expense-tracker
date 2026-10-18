import type { ExpenseRow, ExpenseSyncPayload, SettlementParticipant, SettlementTransfer, SettlementWithUsers } from "@/lib/types";
import { getSupabaseClient } from "@/lib/supabase/client";

export async function insertSyncedExpenses(userId: string, expenses: ExpenseSyncPayload[]) {
  const supabase = getSupabaseClient();
  const rows = expenses.map((expense) => ({
    user_id: userId,
    amount: expense.amount,
    category: expense.category,
    description: expense.description ?? null,
    client_local_id: expense.client_local_id,
    created_at: expense.timestamp,
  }));

  const { data, error } = await supabase
    .from("expenses")
    .upsert(rows, { onConflict: "client_local_id", ignoreDuplicates: true })
    .select("id");

  if (error) throw error;
  return (data ?? []).map((expense) => expense.id as string);
}

export async function getExpensesForUser(userId: string): Promise<ExpenseRow[]> {
  const { data, error } = await getSupabaseClient()
    .from("expenses")
    .select("id, user_id, amount, category, description, is_settled, client_local_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ExpenseRow[];
}

export async function getExpenseLedger() {
  const { data, error } = await getSupabaseClient()
    .from("expenses")
    .select("id, user_id, amount, category, description, is_settled, client_local_id, created_at, user:users(name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getSettlementParticipants(): Promise<SettlementParticipant[]> {
  const { data, error } = await getSupabaseClient()
    .from("users")
    .select("id, name")
    .eq("role", "user")
    .order("id");

  if (error) throw error;
  return (data ?? []) as SettlementParticipant[];
}

export async function getSettlementHistory(): Promise<SettlementWithUsers[]> {
  const { data, error } = await getSupabaseClient()
    .from("settlement_transactions")
    .select("id, from_user_id, to_user_id, amount, settled_at, from_user:users!from_user_id(name), to_user:users!to_user_id(name)")
    .order("settled_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SettlementWithUsers[];
}

export async function settleUnsettledExpenses() {
  // A single Postgres function keeps reading expenses, recording transfers, and marking expenses settled atomic.
  const { data, error } = await getSupabaseClient().rpc("settle_unsettled_expenses");
  if (error) throw error;
  return data as SettlementTransfer[];
}
