"use client";

import { Doc, Id } from "../../../convex/_generated/dataModel";

export default function ClientSelector({
  clients,
  selectedClientId,
  onSelect,
}: {
  clients: Doc<"clients">[];
  selectedClientId: Id<"clients"> | null;
  onSelect: (id: Id<"clients">) => void;
}) {
  const selected = clients.find((c) => c._id === selectedClientId);

  if (clients.length === 0) {
    return <span className="text-xs text-zinc-600">No clients configured</span>;
  }

  return (
    <select
      value={selectedClientId ?? ""}
      onChange={(e) => onSelect(e.target.value as Id<"clients">)}
      className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
    >
      <option value="" disabled>
        Select client...
      </option>
      {clients.map((client) => (
        <option key={client._id} value={client._id}>
          {client.name}
        </option>
      ))}
    </select>
  );
}
