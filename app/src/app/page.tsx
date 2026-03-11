"use client";

import useSWR from "swr";
import { UserButton } from "@clerk/nextjs";
import { useState, useCallback } from "react";
import CsvUpload from "./components/CsvUpload";
import LeadTable from "./components/LeadTable";
import BatchList from "./components/BatchList";
import ClientSelector from "./components/ClientSelector";
import type { Client, Batch, Lead } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Home() {
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
          <UserButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {!selectedClientId ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
            <p className="text-zinc-500">Select a client to get started</p>
          </div>
        ) : (
          <>
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
