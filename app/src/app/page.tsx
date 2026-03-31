"use client";

import useSWR from "swr";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import CsvUpload from "./components/CsvUpload";
import LeadBoard from "./components/LeadTable";
import BatchList from "./components/BatchList";
import ClientSelector from "./components/ClientSelector";
import ManualLeadForm from "./components/ManualLeadForm";
import type { Client, Batch, Lead } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function FunnelMetrics({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return null;

  const total = leads.length;
  const counts: Record<string, number> = {};

  for (const lead of leads) {
    counts[lead.status] = (counts[lead.status] || 0) + 1;
  }

  const scheduled = counts["scheduled"] || 0;
  const bookingRate = total > 0 ? ((scheduled / total) * 100).toFixed(1) : "0";

  const metrics = [
    { label: "Total", value: total, color: "text-zinc-200" },
    { label: "New", value: counts["new"] || 0, color: "text-zinc-400" },
    { label: "Active", value: counts["active"] || 0, color: "text-yellow-400" },
    { label: "Scheduled", value: scheduled, color: "text-green-400" },
    { label: "Failed", value: counts["failed"] || 0, color: "text-red-400" },
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
        <div className="text-center">
          <p className="text-lg font-semibold text-green-400">{bookingRate}%</p>
          <p className="text-xs text-zinc-500">Booking Rate</p>
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
  const { data: leads, mutate: mutateLeads } = useSWR<Lead[]>(leadsUrl, fetcher, {
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
      mutateLeads();
    },
    [selectedClientId, mutateBatches, mutateLeads],
  );

  const handleManualAdd = useCallback(
    async (lead: { name: string; phone: string; email?: string }) => {
      if (!selectedClientId) return;
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId, ...lead }),
      });
      mutateLeads();
    },
    [selectedClientId, mutateLeads],
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

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {!selectedClientId ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
            <p className="text-zinc-500">Select a client to get started</p>
          </div>
        ) : (
          <>
            <FunnelMetrics leads={leads ?? []} />

            <div className="space-y-3">
              <CsvUpload onUpload={handleUpload} />
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs text-zinc-500 mb-3">Or add a single lead</p>
                <ManualLeadForm onAdd={handleManualAdd} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
              <div>
                <BatchList
                  batches={batches ?? []}
                  selectedBatchId={selectedBatchId}
                  onSelect={setSelectedBatchId}
                />
              </div>
              <div>
                <LeadBoard leads={leads ?? []} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
