"use client";

import useSWR from "swr";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import CsvUpload from "./components/CsvUpload";
import LeadTable from "./components/LeadTable";
import BatchList from "./components/BatchList";
import ClientSelector from "./components/ClientSelector";
import type { Client, Batch, Lead } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function FunnelMetrics({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return null;

  const total = leads.length;
  const counts: Record<string, number> = {};
  let totalAttempts = 0;
  let connected = 0;

  for (const lead of leads) {
    counts[lead.status] = (counts[lead.status] || 0) + 1;
    totalAttempts += lead.callAttempts;
    if (
      lead.status === "qualified" ||
      lead.status === "booked" ||
      lead.status === "not_interested"
    ) {
      connected++;
    }
  }

  const booked = counts["booked"] || 0;
  const bookingRate = total > 0 ? ((booked / total) * 100).toFixed(1) : "0";
  const reachRate =
    totalAttempts > 0 ? ((connected / total) * 100).toFixed(1) : "0";

  const metrics = [
    { label: "Total", value: total, color: "text-zinc-200" },
    { label: "Calling", value: counts["calling"] || 0, color: "text-yellow-400" },
    { label: "No Answer", value: counts["no_answer"] || 0, color: "text-orange-400" },
    { label: "Qualified", value: counts["qualified"] || 0, color: "text-blue-400" },
    { label: "Booked", value: counts["booked"] || 0, color: "text-green-400" },
    { label: "Not Interested", value: counts["not_interested"] || 0, color: "text-zinc-500" },
    { label: "Unreachable", value: counts["unreachable"] || 0, color: "text-red-400" },
  ];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div className="flex gap-6">
          {metrics.map((m) => (
            <div key={m.label} className="text-center">
              <p className={`text-lg font-semibold ${m.color}`}>{m.value}</p>
              <p className="text-xs text-zinc-500">{m.label}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-lg font-semibold text-green-400">{bookingRate}%</p>
            <p className="text-xs text-zinc-500">Booking Rate</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-blue-400">{reachRate}%</p>
            <p className="text-xs text-zinc-500">Reach Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  const { data: clients } = useSWR<Client[]>("/api/clients", fetcher);

  const { data: batches, mutate: mutateBatches } = useSWR<Batch[]>(
    selectedClientId ? `/api/batches?clientId=${selectedClientId}` : null,
    fetcher,
  );

  const leadsUrl = selectedClientId
    ? `/api/leads?clientId=${selectedClientId}${selectedBatchId ? `&batchId=${selectedBatchId}` : ""}`
    : null;
  const { data: leads } = useSWR<Lead[]>(leadsUrl, fetcher, {
    refreshInterval: 5000,
  });

  const handleUpload = useCallback(
    async (
      fileName: string,
      uploadedLeads: { name: string; phone: string; email?: string }[],
    ) => {
      if (!selectedClientId) return;
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          fileName,
          leads: uploadedLeads,
        }),
      });
      const batch = await res.json();
      setSelectedBatchId(batch.id);
      mutateBatches();
    },
    [selectedClientId, mutateBatches],
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">SuperFluffer</h1>
          <p className="text-sm text-zinc-500">
            AI voice caller that books appointments
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ClientSelector
            clients={clients ?? []}
            selectedClientId={selectedClientId}
            onSelect={(id) => {
              setSelectedClientId(id);
              setSelectedBatchId(null);
            }}
          />
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

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {!selectedClientId ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
            <p className="text-zinc-500">Select a client to get started</p>
          </div>
        ) : (
          <>
            <FunnelMetrics leads={leads ?? []} />
            <CsvUpload onUpload={handleUpload} />
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
              <div className="lg:col-span-1">
                <BatchList
                  batches={batches ?? []}
                  selectedBatchId={selectedBatchId}
                  onSelect={setSelectedBatchId}
                />
              </div>
              <div className="lg:col-span-3">
                <LeadTable leads={leads ?? []} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
