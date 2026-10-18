"use client";

import { useState } from "react";
import type { ExpenseWithUser, SettlementParticipant } from "@/lib/types";

interface SettlementControlsProps {
  expenses: ExpenseWithUser[];
  roommateCount: number;
  participants: SettlementParticipant[];
}

function formatRupees(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

function calculateSuggestedTransfers(expenses: ExpenseWithUser[], participants: SettlementParticipant[], roommateCount: number) {
  if (roommateCount <= 0) return [];
  const participantIds = new Set(participants.map((participant) => participant.id));
  const unsettledExpenses = expenses.filter((expense) => !expense.is_settled && participantIds.has(expense.user_id));
  const totalCents = unsettledExpenses.reduce((total, expense) => total + Math.round(Number(expense.amount) * 100), 0);
  const baseShare = Math.floor(totalCents / roommateCount);
  const remainder = totalCents % roommateCount;
  const balances = new Map<string, number>();

  participants.forEach((participant) => {
    balances.set(participant.id, 0);
  });
  const orderedUserIds = participants.map((participant) => participant.id).sort();
  orderedUserIds.forEach((userId, index) => balances.set(userId, -baseShare - (index < remainder ? 1 : 0)));
  unsettledExpenses.forEach((expense) => {
    balances.set(expense.user_id, (balances.get(expense.user_id) ?? 0) + Math.round(Number(expense.amount) * 100));
  });

  const names = new Map(expenses.map((expense) => [expense.user_id, expense.user?.name ?? "Unknown user"]));
  participants.forEach((participant) => names.set(participant.id, participant.name));
  const creditors = Array.from(balances.entries()).filter(([, balance]) => balance > 0).map(([id, balance]) => ({ id, balance }));
  const debtors = Array.from(balances.entries()).filter(([, balance]) => balance < 0).map(([id, balance]) => ({ id, balance: -balance }));
  const transfers: { from: string; to: string; amount: number }[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const amount = Math.min(creditors[creditorIndex].balance, debtors[debtorIndex].balance);
    transfers.push({ from: debtors[debtorIndex].id, to: creditors[creditorIndex].id, amount });
    creditors[creditorIndex].balance -= amount;
    debtors[debtorIndex].balance -= amount;
    if (creditors[creditorIndex].balance === 0) creditorIndex += 1;
    if (debtors[debtorIndex].balance === 0) debtorIndex += 1;
  }

  return transfers.map((transfer) => ({ ...transfer, fromName: names.get(transfer.from) ?? "Roommate", toName: names.get(transfer.to) ?? "Roommate" }));
}

export function SettlementControls({ expenses, roommateCount, participants }: SettlementControlsProps) {
  const [isSettling, setIsSettling] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedRoommateId, setSelectedRoommateId] = useState<string | null>(null);
  const participantIds = new Set(participants.map((participant) => participant.id));
  const unsettledExpenses = expenses.filter((expense) => !expense.is_settled && participantIds.has(expense.user_id));
  const total = unsettledExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const suggestedTransfers = calculateSuggestedTransfers(expenses, participants, roommateCount);
  const selectedRoommate = participants.find((participant) => participant.id === selectedRoommateId);
  const selectedRoommateExpenses = selectedRoommate
    ? unsettledExpenses.filter((expense) => expense.user_id === selectedRoommate.id)
    : [];

  function getRoommateUnsettledTotal(roommateId: string) {
    return unsettledExpenses
      .filter((expense) => expense.user_id === roommateId)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
  }

  async function settleExpenses() {
    setIsSettling(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settle", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Settlement failed");
      setMessage(`Settlement recorded with ${result.transfers.length} transfer${result.transfers.length === 1 ? "" : "s"}.`);
      window.location.reload();
    } catch (error) {
      console.error("Error settling expenses:", error);
      setMessage(error instanceof Error ? error.message : "Unable to settle expenses");
    } finally {
      setIsSettling(false);
    }
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg bg-slate-50 p-4">
        <p className="text-sm text-slate-600">Unsettled total <strong className="ml-2 text-base text-slate-900">{formatRupees(total)}</strong></p>
        <p className="text-sm text-slate-600">Per person <strong className="ml-2 text-base text-slate-900">{formatRupees(roommateCount ? Math.round(total * 100 / roommateCount) / 100 : 0)}</strong></p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((participant) => {
          const roommateExpenses = unsettledExpenses.filter((expense) => expense.user_id === participant.id);
          const isSelected = selectedRoommateId === participant.id;

          return (
            <button
              key={participant.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedRoommateId(isSelected ? null : participant.id)}
              className={`rounded-lg border p-4 text-left transition ${isSelected ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 bg-white hover:border-slate-400"}`}
            >
              <span className="block text-sm text-slate-500">{participant.name}</span>
              <strong className="mt-1 block text-xl text-slate-900">{formatRupees(getRoommateUnsettledTotal(participant.id))}</strong>
              <span className="mt-1 block text-xs text-slate-500">{roommateExpenses.length} unsettled {roommateExpenses.length === 1 ? "expense" : "expenses"} · Click to view</span>
            </button>
          );
        })}
      </div>

      {selectedRoommate && (
        <div className="mt-5 rounded-lg border border-slate-200 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{selectedRoommate.name}&apos;s unsettled expenses</h3>
            <span className="text-sm font-medium">Total: {formatRupees(getRoommateUnsettledTotal(selectedRoommate.id))}</span>
          </div>
          {selectedRoommateExpenses.length === 0 ? (
            <p className="text-sm text-slate-500">No unsettled expenses for this roommate.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {selectedRoommateExpenses.map((expense) => (
                <li key={expense.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span><strong>{expense.category}</strong>{expense.description ? ` · ${expense.description}` : ""}</span>
                  <span className="font-semibold">{formatRupees(Number(expense.amount))}</span>
                  <time className="w-full text-xs text-slate-500 sm:w-auto" dateTime={expense.created_at}>
                    {new Date(expense.created_at).toLocaleString("en-IN")}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {unsettledExpenses.length > 0 && <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <h3 className="font-medium text-emerald-950">Who owes whom</h3>
        {suggestedTransfers.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {suggestedTransfers.map((transfer, index) => (
              <li key={`${transfer.from}-${transfer.to}-${index}`} className="text-sm text-emerald-950">
                <strong>{transfer.fromName}</strong> owes <strong>{transfer.toName}</strong> {formatRupees(transfer.amount / 100)}
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-slate-600">No transfers are needed for the current expenses.</p>}
      </div>}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button onClick={settleExpenses} disabled={isSettling || unsettledExpenses.length === 0} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{isSettling ? "Settling…" : "Settle now"}</button>
        {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
      </div>
    </div>
  );
}
