import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roommate Expense Manager",
  description: "Expense ledger and settlement dashboard for roommates.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
