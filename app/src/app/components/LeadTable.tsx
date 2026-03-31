"use client";

import { useState } from "react";
import useSWR from "swr";
import type { Lead, Call } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STAGES = [
  { key: "new", label: "New", color: "text-zinc-400", border: "border-zinc-700" },
  { key: "active", label: "Active", color: "text-yellow-400", border: "border-yellow-800" },
  { key: "scheduled", label: "Scheduled", color: "text-green-400", border: "border-green-800" },
  { key: "failed", label: "Failed", color: "text-red-400", border: "border-red-800" },
] as const;

function CallRow({ call }: { call: Call }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-t border-zinc-800 hover:bg-zinc-800/50 cursor-pointer text-xs"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-3 py-2 text-zinc-500">#{call.attemptNumber}</td>
        <td className="px-3 py-2 text-zinc-400">
          {call.calledAt ? new Date(call.calledAt).toLocaleString() : "—"}
        </td>
        <td className="px-3 py-2">
          <span className={
            call.status === "completed" ? "text-green-400" :
            call.status === "initiated" ? "text-yellow-400" :
            "text-orange-400"
          }>
            {call.status}
          </span>
        </td>
        <td className="px-3 py-2 text-zinc-500">
          {call.duration ? `${call.duration}s` : "—"}
        </td>
        <td className="px-3 py-2 text-zinc-500 truncate max-w-xs">
          {call.summary ?? "—"}
        </td>
        <td className="px-3 py-1 text-zinc-600">
          {(call.transcript || call.summary) ? (expanded ? "▼" : "▶") : ""}
        </td>
      </tr>
      {expanded && call.transcript && (
        <tr className="border-t border-zinc-800/50">
          <td colSpan={6} className="px-3 py-3">
            <pre className="text-xs text-zinc-400 bg-zinc-800 rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-sans">
              {call.transcript}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

function LeadDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { data: leadCalls } = useSWR<Call[]>(
    `/api/calls?leadId=${lead.id}`,
    fetcher,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">{lead.name}</h2>
            <p className="text-sm text-zinc-500 font-mono">{lead.phone}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-zinc-500">Email:</span>{" "}
              <span className="text-zinc-300">{lead.email ?? "—"}</span>
            </div>
            <div>
              <span className="text-zinc-500">Status:</span>{" "}
              <span className="text-zinc-300">{lead.status}</span>
            </div>
            <div>
              <span className="text-zinc-500">Attempts:</span>{" "}
              <span className="text-zinc-300">{lead.callAttempts}/5</span>
            </div>
            {lead.appointmentTime && (
              <div className="col-span-3">
                <span className="text-zinc-500">Appointment:</span>{" "}
                <span className="text-green-400">{lead.appointmentTime}</span>
              </div>
            )}
            {lead.nextRetryAt && (
              <div className="col-span-3">
                <span className="text-zinc-500">Next Retry:</span>{" "}
                <span className="text-zinc-300">{new Date(lead.nextRetryAt).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-2">
              Calls ({leadCalls?.length ?? 0})
            </h3>
            {leadCalls && leadCalls.length > 0 ? (
              <div className="overflow-hidden rounded border border-zinc-800">
                <table className="w-full">
                  <thead className="bg-zinc-800 text-left text-xs text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Duration</th>
                      <th className="px-3 py-2">Summary</th>
                      <th className="px-3 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadCalls.map((c) => (
                      <CallRow key={c.id} call={c} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-zinc-600">No calls yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="rounded border border-zinc-800 bg-zinc-900 p-3 cursor-pointer hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-zinc-200 truncate">{lead.name}</span>
        <span className="text-xs text-zinc-500">{lead.callAttempts}/5</span>
      </div>
      <p className="text-xs font-mono text-zinc-500">{lead.phone}</p>
      {lead.appointmentTime && (
        <p className="text-xs text-green-400 mt-1">{lead.appointmentTime}</p>
      )}
    </div>
  );
}

export default function LeadBoard({ leads }: { leads: Lead[] }) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
        No leads yet. Upload a CSV or add a lead manually.
      </div>
    );
  }

  const grouped = STAGES.map((stage) => ({
    ...stage,
    leads: leads.filter((l) => l.status === stage.key),
  }));

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        {grouped.map((col) => (
          <div key={col.key}>
            <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${col.border}`}>
              <span className={`text-sm font-medium ${col.color}`}>{col.label}</span>
              <span className="text-xs text-zinc-600">{col.leads.length}</span>
            </div>
            <div className="space-y-2">
              {col.leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => setSelectedLead(lead)}
                />
              ))}
              {col.leads.length === 0 && (
                <p className="text-xs text-zinc-700 text-center py-4">Empty</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedLead && (
        <LeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </>
  );
}
