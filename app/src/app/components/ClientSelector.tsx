"use client";

import type { Client } from "@/lib/types";

export default function ClientSelector({
  clients,
  selectedClientId,
  onSelect,
}: {
  clients: Client[];
  selectedClientId: number | null;
  onSelect: (id: number) => void;
}) {
  if (clients.length === 0) {
    return <span className="text-xs text-zinc-600">No clients configured</span>;
  }

  return (
    <select
      value={selectedClientId ?? ""}
      onChange={(e) => onSelect(parseInt(e.target.value))}
      className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
    >
      <option value="" disabled>
        Select client...
      </option>
      {clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.name}
        </option>
      ))}
    </select>
  );
}
