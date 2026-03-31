"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import type { Client } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

export default function AgentConfigPage() {
  const { id } = useParams<{ id: string }>();
  const { data: clients } = useSWR<Client[]>("/api/clients", fetcher);
  const client = clients?.find((c) => c.id === parseInt(id));

  const { data: config, mutate } = useSWR(
    `/api/clients/${id}/agent`,
    fetcher,
  );

  const [prompt, setPrompt] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [calComApiKey, setCalComApiKey] = useState("");
  const [calComEventSlug, setCalComEventSlug] = useState("");
  const [calComEventTypeId, setCalComEventTypeId] = useState("");
  const [windowStart, setWindowStart] = useState("09:00");
  const [windowEnd, setWindowEnd] = useState("17:00");
  const [callDays, setCallDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    if (config) {
      setPrompt(config.agentPrompt ?? "");
      setWelcomeMessage(config.agentWelcomeMessage ?? "");
      setVoiceId(config.agentVoiceId ?? "");
      setPhoneNumber(config.retellPhoneNumber ?? "");
      setCalComEventSlug(config.calComEventSlug ?? "");
      setCalComEventTypeId(config.calComEventTypeId ?? "");
      setWindowStart(config.callWindowStart ?? "09:00");
      setWindowEnd(config.callWindowEnd ?? "17:00");
      setCallDays((config.callDays ?? "mon,tue,wed,thu,fri").split(","));
    }
  }, [config]);

  function toggleDay(day: string) {
    setCallDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  const [provisioning, setProvisioning] = useState(false);
  const [assigningPhone, setAssigningPhone] = useState(false);
  const [availablePhones, setAvailablePhones] = useState<{ phoneNumber: string; nickname: string | null; pretty: string | null }[] | null>(null);
  const needsAgent = !config?.retellAgentId || config?.retellAgentId === "placeholder-agent-id";
  const needsPhone = !needsAgent && (!config?.retellPhoneNumber || config?.retellPhoneNumber === "placeholder-phone");

  async function handleProvision() {
    setProvisioning(true);
    setStatus({ type: "success", msg: "Creating agent in Retell... this may take a moment." });
    try {
      const res = await fetch(`/api/clients/${id}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "provision" }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setStatus({ type: "error", msg: `Unexpected response: ${text.slice(0, 200)}` });
        return;
      }
      if (data.ok) {
        const phoneMsg = data.phoneNumber
          ? ` Phone ${data.phoneNumber} auto-assigned.`
          : " No phone numbers found — assign one below.";
        setStatus({ type: "success", msg: `Agent created (${data.agentId})!${phoneMsg}` });
        mutate();
      } else {
        setStatus({ type: "error", msg: data.error || `Provisioning failed: ${JSON.stringify(data)}` });
      }
    } catch (err) {
      setStatus({ type: "error", msg: `Provisioning failed: ${err}` });
    } finally {
      setProvisioning(false);
    }
  }

  async function loadPhones() {
    const res = await fetch(`/api/clients/${id}/agent?phones=1`);
    const data = await res.json();
    if (Array.isArray(data)) setAvailablePhones(data);
  }

  async function handleAssignPhone(phone: string) {
    setAssigningPhone(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/clients/${id}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assignPhone", phoneNumber: phone }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus({ type: "success", msg: `Phone ${phone} assigned to agent` });
        mutate();
      } else {
        setStatus({ type: "error", msg: data.error || "Assignment failed" });
      }
    } catch {
      setStatus({ type: "error", msg: "Phone assignment failed" });
    } finally {
      setAssigningPhone(false);
    }
  }

  const [buyingPhone, setBuyingPhone] = useState(false);

  async function handleBuyPhone() {
    setBuyingPhone(true);
    setStatus({ type: "success", msg: "Purchasing new phone number..." });
    try {
      const res = await fetch(`/api/clients/${id}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buyPhone" }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus({ type: "success", msg: `New number purchased: ${data.phoneNumber}` });
        mutate();
      } else {
        setStatus({ type: "error", msg: data.error || "Purchase failed" });
      }
    } catch (err) {
      setStatus({ type: "error", msg: `Purchase failed: ${err}` });
    } finally {
      setBuyingPhone(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);

    const body: Record<string, string> = {
      agentPrompt: prompt,
      agentWelcomeMessage: welcomeMessage,
      agentVoiceId: voiceId,
      calComEventSlug: calComEventSlug,
      calComEventTypeId: calComEventTypeId,
      callWindowStart: windowStart,
      callWindowEnd: windowEnd,
      callDays: callDays.join(","),
    };
    if (calComApiKey) body.calComApiKey = calComApiKey;

    try {
      const res = await fetch(`/api/clients/${id}/agent`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.retellSync === false) {
        setStatus({ type: "error", msg: `Saved locally but Retell sync failed: ${data.error}` });
      } else {
        setStatus({ type: "success", msg: "Saved and synced to Retell" });
      }
      mutate();
    } catch {
      setStatus({ type: "error", msg: "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Agent Config {client ? `— ${client.name}` : ""}
          </h1>
          <p className="text-sm text-zinc-500">
            Configure the Retell agent, script, and call schedule
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save & Sync"}
          </button>
          <Link
            href="/"
            className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600"
          >
            Back to Clients
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {status && (
          <div className={`rounded-lg border p-3 text-sm ${
            status.type === "success"
              ? "border-green-800 bg-green-900/20 text-green-400"
              : "border-red-800 bg-red-900/20 text-red-400"
          }`}>
            {status.msg}
          </div>
        )}

        {/* Step 1: Provision agent */}
        {needsAgent && (
          <div className="rounded-lg border border-orange-800 bg-orange-900/10 p-5 space-y-3">
            <div>
              <h2 className="text-sm font-medium text-orange-400">Step 1: Create Retell Agent</h2>
              <p className="text-xs text-zinc-500 mt-1">
                Creates an LLM and agent in Retell with a default prompt. You can customize the script below after creation.
              </p>
            </div>
            <button
              onClick={handleProvision}
              disabled={provisioning}
              className={`rounded px-4 py-2 text-sm font-medium ${
                provisioning
                  ? "bg-zinc-700 text-zinc-400 animate-pulse"
                  : "bg-orange-600 hover:bg-orange-500"
              }`}
            >
              {provisioning ? "⏳ Creating Agent in Retell..." : "Create Retell Agent"}
            </button>
          </div>
        )}

        {/* Phone number assignment */}
        {needsPhone && (
          <div className="rounded-lg border border-blue-800 bg-blue-900/10 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-medium text-blue-400">Assign Phone Number</h2>
              <p className="text-xs text-zinc-500 mt-1">
                Choose an existing number from your Retell account, or purchase a new one.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  await loadPhones();
                }}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
              >
                Use Existing Number
              </button>
              <button
                onClick={handleBuyPhone}
                disabled={buyingPhone}
                className={`rounded px-4 py-2 text-sm font-medium border ${
                  buyingPhone
                    ? "bg-zinc-700 text-zinc-400 animate-pulse border-zinc-700"
                    : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                }`}
              >
                {buyingPhone ? "Purchasing..." : "Buy New Number"}
              </button>
            </div>

            {availablePhones && availablePhones.length > 0 && (
              <div className="space-y-2">
                {availablePhones.map((p) => (
                  <div key={p.phoneNumber} className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-3 py-2">
                    <div>
                      <span className="text-sm font-mono text-zinc-300">{p.phoneNumber}</span>
                      {p.nickname && <span className="text-xs text-zinc-500 ml-2">{p.nickname}</span>}
                    </div>
                    <button
                      onClick={() => handleAssignPhone(p.phoneNumber)}
                      disabled={assigningPhone}
                      className="rounded bg-blue-600 px-3 py-1 text-xs font-medium hover:bg-blue-500 disabled:opacity-50"
                    >
                      {assigningPhone ? "..." : "Use This"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {availablePhones && availablePhones.length === 0 && (
              <p className="text-xs text-zinc-500">No phone numbers on Retell account. Buy one above.</p>
            )}
          </div>
        )}

        {/* Retell IDs */}
        {config?.retellAgentId && !needsAgent && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-xs text-zinc-500 flex gap-6">
            <span>Agent: <span className="font-mono text-zinc-400">{config.retellAgentId}</span></span>
            <span>LLM: <span className="font-mono text-zinc-400">{config.retellLlmId}</span></span>
          </div>
        )}

        {/* Agent Script */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-300">Agent Script</h2>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Welcome Message</label>
            <input
              type="text"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Hi {{lead_name}}, this is Sarah calling from..."
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-zinc-600 mt-1">First thing the agent says. Use {"{{lead_name}}"} for the lead's name.</p>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">System Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={16}
              placeholder="You are a friendly appointment setter for a real estate agent..."
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none font-mono leading-relaxed"
            />
            <p className="text-xs text-zinc-600 mt-1">
              The full prompt/instructions for the Retell agent. Available variables: {"{{lead_name}}"}, {"{{lead_phone}}"}, {"{{cal_com_link}}"}
            </p>
          </div>
        </section>

        {/* Voice & Phone */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-300">Voice & Phone</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Voice ID</label>
              <input
                type="text"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                placeholder="11labs-Adrian"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none font-mono"
              />
              <p className="text-xs text-zinc-600 mt-1">Retell voice ID (e.g. 11labs-Adrian, 11labs-Rachel)</p>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+15125551234"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none font-mono"
              />
              <p className="text-xs text-zinc-600 mt-1">Retell phone number to call from</p>
            </div>
          </div>
        </section>

        {/* Cal.com */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-300">Cal.com Integration</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Cal.com API Key</label>
              <input
                type="password"
                value={calComApiKey}
                onChange={(e) => setCalComApiKey(e.target.value)}
                placeholder={config?.calComApiKey ? "••••configured (leave blank to keep)" : "cal_live_..."}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Event Slug</label>
              <input
                type="text"
                value={calComEventSlug}
                onChange={(e) => setCalComEventSlug(e.target.value)}
                placeholder="30-min-call"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Event Type ID</label>
              <input
                type="text"
                value={calComEventTypeId}
                onChange={(e) => setCalComEventTypeId(e.target.value)}
                placeholder="123456"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>
        </section>

        {/* Call Schedule */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-300">Call Schedule</h2>
          <p className="text-xs text-zinc-500">
            Calls will only be placed during this window in the client's timezone ({client?.timezone ?? "..."})
          </p>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Start</label>
              <input
                type="time"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <span className="text-zinc-600 mt-5">to</span>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">End</label>
              <input
                type="time"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-2">Call Days</label>
            <div className="flex gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => toggleDay(day.key)}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    callDays.includes(day.key)
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
