"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Client } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

function ClientForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Client;
  onSave: (data: Partial<Client>) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [timezone, setTimezone] = useState(initial?.timezone ?? "America/Chicago");
  const [saving, setSaving] = useState(false);

  function autoSlug(n: string) {
    return n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      id: initial?.id,
      name,
      slug: slug || autoSlug(name),
      industry,
      timezone,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!initial) setSlug(autoSlug(e.target.value));
            }}
            placeholder="Greg"
            required
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="greg"
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Industry *</label>
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="real_estate"
            required
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Timezone *</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </div>

      {!initial && (
        <p className="text-xs text-zinc-500">
          A Retell agent and phone number will be auto-provisioned when you create the client.
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={saving || !name.trim() || !industry.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : initial ? "Update Client" : "Create Client"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ClientCard({
  client,
  onEdit,
}: {
  client: Client;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">{client.name}</span>
          <span className="text-xs text-zinc-600 font-mono">{client.slug}</span>
        </div>
        <div className="flex gap-4 mt-1 text-xs text-zinc-500">
          <span>{client.industry}</span>
          <span>{client.timezone}</span>
          {client.retellAgentId && client.retellAgentId !== "" && (
            <span className="font-mono">{client.retellAgentId.slice(0, 12)}...</span>
          )}
          {client.retellPhoneNumber && client.retellPhoneNumber !== "" && (
            <span className="font-mono">{client.retellPhoneNumber}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`/clients/${client.id}/agent`}
          className="rounded px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-800 hover:border-blue-600"
        >
          Configure Agent
        </Link>
        <button
          onClick={onEdit}
          className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const { data: allClients, mutate } = useSWR<Client[]>("/api/clients", fetcher);
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleSave(data: Partial<Client>) {
    if (data.id) {
      await fetch("/api/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setEditing(null);
    setCreating(false);
    mutate();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-zinc-500">Manage client accounts and integrations</p>
        </div>
        <div className="flex items-center gap-3">
          {!creating && !editing && (
            <button
              onClick={() => setCreating(true)}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium hover:bg-blue-500"
            >
              New Client
            </button>
          )}
          <Link
            href="/"
            className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {creating && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-sm font-medium text-zinc-300 mb-4">New Client</h2>
            <ClientForm onSave={handleSave} onCancel={() => setCreating(false)} />
          </div>
        )}

        {editing && (
          <div className="rounded-lg border border-blue-800 bg-zinc-900 p-5">
            <h2 className="text-sm font-medium text-zinc-300 mb-4">Edit {editing.name}</h2>
            <ClientForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
          </div>
        )}

        {!allClients ? (
          <p className="text-zinc-500">Loading...</p>
        ) : allClients.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
            <p className="text-zinc-500">No clients yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onEdit={() => {
                  setEditing(client);
                  setCreating(false);
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
