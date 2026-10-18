import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getExpenseLedger, getSettlementHistory, getSettlementParticipants } from "@/lib/expenses";
import type { ExpenseWithUser, SettlementParticipant, SettlementWithUsers } from "@/lib/types";
import { SettlementControls } from "@/components/settlement-controls";

function formatRupees(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  let expenses: ExpenseWithUser[] = [];
  let settlementParticipants: SettlementParticipant[] = [];
  let settlementHistory: SettlementWithUsers[] = [];
  let loadError = "";
  try {
    expenses = await getExpenseLedger() as ExpenseWithUser[];
    settlementParticipants = await getSettlementParticipants();
    settlementHistory = await getSettlementHistory();
  } catch (error) {
    console.error("Error loading admin dashboard:", error);
    loadError = "The expense ledger could not be loaded. Check the database connection and refresh.";
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-medium uppercase tracking-wide text-slate-500">Roommate Expense Manager</p><h1 className="mt-1 text-3xl font-semibold">Admin dashboard</h1></div>
        <a href="/api/admin/logout" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium">Log out</a>
      </header>

      {loadError && <p role="alert" className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}
      <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Settlement calculator</h2>
        <p className="mt-1 text-sm text-slate-500">Unsettled expenses are split across the roommate accounts.</p>
        <SettlementControls expenses={expenses} roommateCount={settlementParticipants.length} participants={settlementParticipants} />
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Expense ledger</h2><span className="text-sm text-slate-500">{expenses.length} entries</span></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr className="border-b text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Date</th><th className="px-3 py-3">User</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Description</th><th className="px-3 py-3">Status</th></tr></thead>
            <tbody>
              {expenses.map((expense) => <tr key={expense.id} className="border-b last:border-0">
                <td className="whitespace-nowrap px-3 py-3">{new Date(expense.created_at).toLocaleString("en-IN")}</td>
                <td className="px-3 py-3">{expense.user?.name ?? "Unknown user"}</td>
                <td className="px-3 py-3">{expense.category}</td>
                <td className="whitespace-nowrap px-3 py-3">{formatRupees(Number(expense.amount))}</td>
                <td className="max-w-xs truncate px-3 py-3">{expense.description || "—"}</td>
                <td className="px-3 py-3"><span className={expense.is_settled ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700" : "rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700"}>{expense.is_settled ? "Settled" : "Unsettled"}</span></td>
              </tr>)}
              {expenses.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No expenses recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Settlement history</h2>
          <span className="text-sm text-slate-500">{settlementHistory.length} transfers</span>
        </div>
        {settlementHistory.length === 0 ? (
          <p className="text-sm text-slate-500">No settlements have been recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {settlementHistory.map((transaction) => (
              <li key={transaction.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>
                  <strong>{transaction.from_user?.name ?? "Unknown user"}</strong> needs to pay{" "}
                  <strong>{transaction.to_user?.name ?? "Unknown user"}</strong>
                </span>
                <span className="whitespace-nowrap font-semibold">{formatRupees(Number(transaction.amount))}</span>
                <time className="w-full text-xs text-slate-500 sm:w-auto" dateTime={transaction.settled_at}>
                  {new Date(transaction.settled_at).toLocaleString("en-IN")}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
