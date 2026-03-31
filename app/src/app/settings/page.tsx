"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";

interface Setting {
  id: number;
  key: string;
  value: string;
  label: string;
  category: string;
  sensitive: boolean;
  updatedAt: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function SettingRow({
  setting,
  onSave,
}: {
  setting: Setting;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setValue(setting.sensitive ? "" : setting.value);
    setEditing(true);
  }

  async function save() {
    if (!value.trim()) return;
    setSaving(true);
    await onSave(setting.key, value.trim());
    setEditing(false);
    setSaving(false);
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800">
      <div className="flex-1">
        <p className="text-sm font-medium text-zinc-200">{setting.label}</p>
        <p className="text-xs text-zinc-600 font-mono">{setting.key}</p>
      </div>
      <div className="flex items-center gap-3">
        {editing ? (
          <>
            <input
              type={setting.sensitive ? "password" : "text"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={setting.sensitive ? "Enter new value..." : ""}
              className="w-64 rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 font-mono placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            <button
              onClick={save}
              disabled={saving || !value.trim()}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? "..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-zinc-400 font-mono">{setting.value}</span>
            <button
              onClick={startEdit}
              className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600"
            >
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: allSettings, mutate } = useSWR<Setting[]>("/api/settings", fetcher);

  async function handleSave(key: string, value: string) {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    mutate();
  }

  const categories = allSettings
    ? [...new Set(allSettings.map((s) => s.category))]
    : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-zinc-500">API keys and configuration</p>
        </div>
        <Link
          href="/"
          className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600"
        >
          Back to Dashboard
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {!allSettings ? (
          <p className="text-zinc-500">Loading...</p>
        ) : allSettings.length === 0 ? (
          <p className="text-zinc-500">No settings configured yet.</p>
        ) : (
          categories.map((cat) => (
            <div key={cat}>
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
                {cat}
              </h2>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4">
                {allSettings
                  .filter((s) => s.category === cat)
                  .map((setting) => (
                    <SettingRow
                      key={setting.id}
                      setting={setting}
                      onSave={handleSave}
                    />
                  ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
