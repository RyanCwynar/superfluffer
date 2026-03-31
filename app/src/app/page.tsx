"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Client } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Home() {
  const router = useRouter();
  const { data: clients } = useSWR<Client[]>("/api/clients", fetcher);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">SuperFluffer</h1>
          <p className="text-sm text-zinc-500">AI voice caller that books appointments</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/clients"
            className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600"
          >
            Manage Clients
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

      <main className="mx-auto max-w-4xl px-6 py-8">
        {!clients ? (
          <p className="text-zinc-500">Loading...</p>
        ) : clients.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center space-y-4">
            <p className="text-zinc-500">No clients yet.</p>
            <Link
              href="/clients"
              className="inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
            >
              Create Your First Client
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-zinc-400">Select a client</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-600 transition-colors group"
                >
                  <h3 className="text-lg font-semibold text-zinc-200 group-hover:text-white">
                    {client.name}
                  </h3>
                  <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                    <span>{client.industry}</span>
                    <span>{client.timezone}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {client.retellAgentId ? (
                      <span className="text-xs text-green-500">Agent configured</span>
                    ) : (
                      <span className="text-xs text-orange-400">Needs agent setup</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
