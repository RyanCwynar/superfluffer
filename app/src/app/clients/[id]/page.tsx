"use client";

import useSWR from "swr";
import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import CsvUpload from "../../components/CsvUpload";
import LeadBoard from "../../components/LeadTable";
import BatchList from "../../components/BatchList";
import ManualLeadForm from "../../components/ManualLeadForm";
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

export default function ClientDashboard() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const clientId = parseInt(id);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  const { data: clients } = useSWR<Client[]>("/api/clients", fetcher);
  const client = clients?.find((c) => c.id === clientId);

  const { data: batches, mutate: mutateBatches } = useSWR<Batch[]>(
    `/api/batches?clientId=${clientId}`,
    fetcher,
  );

  const leadsUrl = `/api/leads?clientId=${clientId}${selectedBatchId ? `&batchId=${selectedBatchId}` : ""}`;
  const { data: leads, mutate: mutateLeads } = useSWR<Lead[]>(leadsUrl, fetcher, {
    refreshInterval: 5000,
  });

  const handleUpload = useCallback(
    async (
      fileName: string,
      uploadedLeads: { name: string; phone: string; email?: string }[],
    ) => {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          fileName,
          leads: uploadedLeads,
        }),
      });
      const batch = await res.json();
      setSelectedBatchId(batch.id);
      mutateBatches();
      mutateLeads();
    },
    [clientId, mutateBatches, mutateLeads],
  );

  const handleManualAdd = useCallback(
    async (lead: { name: string; phone: string; email?: string }) => {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, ...lead }),
      });
      mutateLeads();
    },
    [clientId, mutateLeads],
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm">
            ← Home
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {client?.name ?? "Loading..."}
            </h1>
            <p className="text-sm text-zinc-500">
              {client?.industry} · {client?.timezone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/clients/${id}/agent`}
            className="rounded px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-800 hover:border-blue-600"
          >
            Agent Config
          </Link>
          <Link
            href="/clients"
            className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600"
          >
            All Clients
          </Link>
          <Link
            href="/settings"
            className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600"
          >
            Settings
          </Link>
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
        {!client?.retellAgentId && (
          <div className="rounded-lg border border-orange-800 bg-orange-900/10 p-4 flex items-center justify-between">
            <p className="text-sm text-orange-400">
              This client needs a Retell agent configured before calls can be placed.
            </p>
            <Link
              href={`/clients/${id}/agent`}
              className="rounded bg-orange-600 px-4 py-1.5 text-sm font-medium hover:bg-orange-500"
            >
              Configure Agent
            </Link>
          </div>
        )}

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
      </main>
    </div>
  );
}
