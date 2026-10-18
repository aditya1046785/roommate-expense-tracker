export type ExpenseCategory = "Dairy" | "Vegetables" | "Spices" | "Other";
export type UserRole = "user" | "admin";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  user_id: string;
  amount: number;
  category: ExpenseCategory;
  description: string | null;
  is_settled: boolean;
  client_local_id: string;
  created_at: string;
}

export interface ExpenseWithUser extends ExpenseRow {
  user: { name: string } | null;
}

export interface SettlementTransactionRow {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  settled_at: string;
}

export interface SettlementWithUsers extends SettlementTransactionRow {
  from_user: { name: string } | null;
  to_user: { name: string } | null;
}

export interface SettlementParticipant {
  id: string;
  name: string;
}

export interface ExpenseSyncPayload {
  amount: number;
  category: ExpenseCategory;
  description?: string;
  client_local_id: string;
  timestamp: string;
}

export interface SettlementTransfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}
