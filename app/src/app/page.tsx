"use client";

import useSWR from "swr";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Client } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
];

function NewClientForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [timezone, setTimezone] = useState("America/Chicago");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, industry, timezone }),
      });
      const data = await res.json();
      if (data.provisionError) {
        setError(`Client created but agent provisioning failed: ${data.provisionError}`);
      }
      setName("");
      setIndustry("");
      onCreated();
    } catch {
      setError("Failed to create client");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 flex-wrap">
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Name *</label>
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Greg" required
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none w-40"
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Industry *</label>
        <input
          type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
          placeholder="real_estate" required
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none w-40"
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Timezone</label>
        <select
          value={timezone} onChange={(e) => setTimezone(e.target.value)}
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
        >
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.split("/")[1]}</option>)}
        </select>
      </div>
      <button
        type="submit" disabled={saving || !name.trim() || !industry.trim()}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
      >
        {saving ? "Creating..." : "New Client"}
      </button>
      {error && <p className="text-xs text-red-400 w-full">{error}</p>}
    </form>
  );
}

export default function Home() {
  const router = useRouter();
  const { data: clients, mutate } = useSWR<Client[]>("/api/clients", fetcher);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">SuperFluffer</h1>
          <p className="text-sm text-zinc-500">AI voice caller that books appointments</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600"
          >
            Settings
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
            }}
            className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {!clients ? (
          <p className="text-zinc-500">Loading...</p>
        ) : (
          <>
            {clients.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-600 transition-colors group"
                  >
                    <h3 className="text-lg font-semibold text-zinc-200 group-hover:text-white">
                      {client.name}
                    </h3>
                    <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                      <span>{client.industry}</span>
                      <span>{client.timezone}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {client.retellAgentId && client.retellAgentId !== "placeholder-agent-id" ? (
                        <span className="text-xs text-green-500">Agent configured</span>
                      ) : (
                        <span className="text-xs text-orange-400">Needs agent setup</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 mb-3">Add a new client</p>
              <NewClientForm onCreated={() => mutate()} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
