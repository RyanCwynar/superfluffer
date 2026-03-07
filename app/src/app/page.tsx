"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useCallback } from "react";
import CsvUpload from "./components/CsvUpload";
import LeadTable from "./components/LeadTable";
import BatchList from "./components/BatchList";
import { Id } from "../../convex/_generated/dataModel";

export default function Home() {
  const [selectedBatchId, setSelectedBatchId] = useState<Id<"batches"> | null>(
    null,
  );
  const batches = useQuery(api.batches.list);
  const leads = useQuery(api.leads.list, {
    batchId: selectedBatchId ?? undefined,
  });
  const createBatch = useMutation(api.batches.create);

  const handleUpload = useCallback(
    async (
      fileName: string,
      leads: { name: string; phone: string; email?: string }[],
    ) => {
      const batchId = await createBatch({ fileName, leads });
      setSelectedBatchId(batchId);
    },
    [createBatch],
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">AutoBook</h1>
        <p className="text-sm text-zinc-500">
          Upload leads, AI calls them, books appointments
        </p>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
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
      </main>
    </div>
  );
}
