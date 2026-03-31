"use client";

import { useState } from "react";
import { normalizePhone } from "@/lib/phone";

export default function ManualLeadForm({
  onAdd,
}: {
  onAdd: (lead: { name: string; phone: string; email?: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handlePhoneChange(raw: string) {
    // Allow typing freely, only digits and common chars
    setPhone(raw);
  }

  function handlePhoneBlur() {
    // Auto-format on blur if valid
    const normalized = normalizePhone(phone);
    if (normalized && phone.trim()) {
      const d = normalized.slice(2); // strip +1
      setPhone(`(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError("Invalid phone number. Enter a 10-digit US number.");
      return;
    }

    setSubmitting(true);
    try {
      await onAdd({ name: name.trim(), phone: normalized, email: email.trim() || undefined });
      setSuccess(`Added ${name.trim()}`);
      setName("");
      setPhone("");
      setEmail("");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to add lead");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
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
            onChange={(e) => handlePhoneChange(e.target.value)}
            onBlur={handlePhoneBlur}
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
      </form>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      {success && <p className="text-xs text-green-400 mt-2">{success}</p>}
    </div>
  );
}
