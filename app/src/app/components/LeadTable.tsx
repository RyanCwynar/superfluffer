"use client";

import { Doc } from "../../../convex/_generated/dataModel";

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

export default function LeadTable({ leads }: { leads: Doc<"leads">[] }) {
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
              <tr
                key={lead._id}
                className="border-t border-zinc-800 hover:bg-zinc-900/50"
              >
                <td className="px-4 py-2 text-zinc-200">{lead.name}</td>
                <td className="px-4 py-2 font-mono text-xs text-zinc-400">
                  {lead.phone}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-2 text-zinc-500">
                  {lead.callAttempts}/3
                </td>
                <td className="px-4 py-2 text-xs text-zinc-400">
                  {lead.appointmentTime ?? "-"}
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-xs text-zinc-500">
                  {lead.notes ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
