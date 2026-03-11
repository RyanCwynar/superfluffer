"use client";

import type { Batch } from "@/lib/types";

const BATCH_STATUS: Record<string, { label: string; color: string }> = {
  processing: { label: "Processing", color: "text-yellow-400" },
  calling: { label: "Calling", color: "text-blue-400" },
  completed: { label: "Completed", color: "text-green-400" },
};

export default function BatchList({
  batches,
  selectedBatchId,
  onSelect,
}: {
  batches: Batch[];
  selectedBatchId: number | null;
  onSelect: (id: number | null) => void;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-zinc-400">Batches</h2>

      <button
        onClick={() => onSelect(null)}
        className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
          selectedBatchId === null
            ? "bg-zinc-800 text-zinc-100"
            : "text-zinc-400 hover:bg-zinc-900"
        }`}
      >
        All Leads
      </button>

      {batches.map((batch) => {
        const style = BATCH_STATUS[batch.status] ?? {
          label: batch.status,
          color: "text-zinc-500",
        };
        return (
          <button
            key={batch.id}
            onClick={() => onSelect(batch.id)}
            className={`w-full rounded px-3 py-2 text-left transition-colors ${
              selectedBatchId === batch.id
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-900"
            }`}
          >
            <p className="text-sm truncate">{batch.fileName}</p>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs text-zinc-600">
                {batch.totalLeads} lead{batch.totalLeads !== 1 ? "s" : ""}
              </span>
              <span className={`text-xs ${style.color}`}>{style.label}</span>
            </div>
          </button>
        );
      })}

      {batches.length === 0 && (
        <p className="px-3 text-xs text-zinc-600">No batches yet</p>
      )}
    </div>
  );
}
