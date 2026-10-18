"use client";

import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
      });
      const result = await response.json();
      if (!response.ok || result.user?.role !== "admin") {
        setErrorMessage(result.user?.role === "user" ? "This account does not have administrator access" : result.error);
        return;
      }

      window.location.href = "/admin/dashboard";
    } catch (error) {
      console.error("Error submitting admin login:", error);
      setErrorMessage("Unable to log in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold">Admin login</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in to manage shared expenses.</p>
        <label className="mb-4 block text-sm font-medium">Email
          <input name="email" type="email" autoComplete="username" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <label className="mb-5 block text-sm font-medium">Password
          <input name="password" type="password" autoComplete="current-password" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        {errorMessage && <p role="alert" className="mb-4 text-sm text-red-600">{errorMessage}</p>}
        <button disabled={isSubmitting} className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
