"use client";

import { useState } from "react";
import type { Lead } from "@/lib/types";

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-zinc-500" },
  calling: { label: "Calling", color: "text-yellow-400" },
  no_answer: { label: "No Answer", color: "text-orange-400" },
  qualified: { label: "Qualified", color: "text-blue-400" },
  booked: { label: "Booked", color: "text-green-400" },
  not_interested: { label: "Not Interested", color: "text-zinc-500" },
  unreachable: { label: "Unreachable", color: "text-red-400" },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? {
    label: status,
    color: "text-zinc-500",
  };
  return (
    <span className={`text-xs font-medium ${style.color}`}>{style.label}</span>
  );
}

function LeadDetail({ lead }: { lead: Lead }) {
  return (
    <div className="px-4 py-4 space-y-4 bg-zinc-900/30">
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-zinc-500">Email:</span>{" "}
          <span className="text-zinc-300">{lead.email ?? "—"}</span>
        </div>
        <div>
          <span className="text-zinc-500">Appointment:</span>{" "}
          <span className="text-zinc-300">{lead.appointmentTime ?? "—"}</span>
        </div>
        <div>
          <span className="text-zinc-500">Last Call:</span>{" "}
          <span className="text-zinc-300">
            {lead.lastCallAt
              ? new Date(lead.lastCallAt).toLocaleString()
              : "—"}
          </span>
        </div>
        <div>
          <span className="text-zinc-500">Next Retry:</span>{" "}
          <span className="text-zinc-300">
            {lead.nextRetryAt
              ? new Date(lead.nextRetryAt).toLocaleString()
              : "—"}
          </span>
        </div>
      </div>

      {lead.notes && (
        <div>
          <p className="text-xs text-zinc-500 mb-1">Call Summary</p>
          <p className="text-sm text-zinc-300 bg-zinc-800 rounded p-3">
            {lead.notes}
          </p>
        </div>
      )}

      {lead.transcript && (
        <div>
          <p className="text-xs text-zinc-500 mb-1">Transcript</p>
          <pre className="text-xs text-zinc-400 bg-zinc-800 rounded p-3 max-h-64 overflow-y-auto whitespace-pre-wrap font-sans">
            {lead.transcript}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function LeadTable({ leads }: { leads: Lead[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
        No leads yet. Upload a CSV to get started.
      </div>
    );
  }

  const counts = leads.reduce(
    (acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs">
        {Object.entries(counts).map(([status, count]) => {
          const style = STATUS_STYLES[status];
          return (
            <span key={status} className={style?.color ?? "text-zinc-500"}>
              {style?.label ?? status}: {count}
            </span>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Attempts</th>
              <th className="px-4 py-2">Appointment</th>
              <th className="px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <>
                <tr
                  key={lead.id}
                  className="border-t border-zinc-800 hover:bg-zinc-900/50 cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === lead.id ? null : lead.id)
                  }
                >
                  <td className="px-4 py-2 text-zinc-200">
                    <span className="mr-1.5 text-zinc-600 text-xs">
                      {expandedId === lead.id ? "▼" : "▶"}
                    </span>
                    {lead.name}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-400">
                    {lead.phone}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {lead.callAttempts}/5
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-400">
                    {lead.appointmentTime ?? "—"}
                  </td>
                  <td className="max-w-xs truncate px-4 py-2 text-xs text-zinc-500">
                    {lead.notes ?? "—"}
                  </td>
                </tr>
                {expandedId === lead.id && (
                  <tr key={`${lead.id}-detail`} className="border-t border-zinc-800/50">
                    <td colSpan={6}>
                      <LeadDetail lead={lead} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
