"use client";

import { useState } from "react";

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export default function ManualLeadForm({
  onAdd,
}: {
  onAdd: (lead: { name: string; phone: string; email?: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError("Invalid phone number (need 10-digit US number)");
      return;
    }

    setSubmitting(true);
    try {
      await onAdd({ name: name.trim(), phone: normalized, email: email.trim() || undefined });
      setName("");
      setPhone("");
      setEmail("");
    } catch {
      setError("Failed to add lead");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <label className="block text-xs text-zinc-500 mb-1">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Smith"
          required
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="flex-1">
        <label className="block text-xs text-zinc-500 mb-1">Phone *</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(512) 555-1234"
          required
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="flex-1">
        <label className="block text-xs text-zinc-500 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@example.com"
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !name.trim() || !phone.trim()}
        className="rounded bg-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-600 disabled:opacity-50 whitespace-nowrap"
      >
        {submitting ? "Adding..." : "Add Lead"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
