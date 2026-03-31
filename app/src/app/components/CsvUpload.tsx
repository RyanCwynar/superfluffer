"use client";

import { useState, useRef } from "react";
import { normalizePhone, formatPhone } from "@/lib/phone";

interface Lead {
  name: string;
  phone: string;
  email?: string;
}

function parseCsv(text: string): { leads: Lead[]; skipped: number } {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { leads: [], skipped: 0 };

  const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const nameIdx = headers.findIndex((h) =>
    ["name", "full name", "fullname", "first name", "firstname"].includes(h),
  );
  const phoneIdx = headers.findIndex((h) =>
    ["phone", "phone number", "phonenumber", "mobile", "cell", "telephone"].includes(h),
  );
  const emailIdx = headers.findIndex((h) =>
    ["email", "email address", "e-mail"].includes(h),
  );

  if (nameIdx === -1 || phoneIdx === -1) return { leads: [], skipped: 0 };

  const leads: Lead[] = [];
  let skipped = 0;
  const seenPhones = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const name = cols[nameIdx];
    const rawPhone = cols[phoneIdx] || "";
    const phone = normalizePhone(rawPhone);
    const email = emailIdx >= 0 ? cols[emailIdx] : undefined;

    if (!name || !phone) {
      skipped++;
      continue;
    }

    // Dedupe within same CSV
    if (seenPhones.has(phone)) {
      skipped++;
      continue;
    }
    seenPhones.add(phone);

    leads.push({ name, phone, email: email || undefined });
  }

  return { leads, skipped };
}

export default function CsvUpload({
  onUpload,
}: {
  onUpload: (fileName: string, leads: Lead[]) => Promise<void>;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<Lead[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError("");
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { leads, skipped: skip } = parseCsv(text);
      setSkipped(skip);
      if (leads.length === 0) {
        setError(
          "No valid leads found. CSV needs 'name' and 'phone' columns.",
        );
        setPreview(null);
        return;
      }
      setPreview(leads);
    };
    reader.readAsText(file);
  }

  async function handleConfirm() {
    if (!preview) return;
    setUploading(true);
    try {
      await onUpload(fileName, preview);
      setPreview(null);
      setFileName("");
      setSkipped(0);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-500/10"
            : "border-zinc-700 hover:border-zinc-500"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <p className="text-zinc-400">
          Drop a CSV here or click to upload
        </p>
        <div className="mt-2 text-xs text-zinc-600 space-y-0.5">
          <p>Required columns: <span className="text-zinc-500">name</span>, <span className="text-zinc-500">phone</span></p>
          <p>Optional: <span className="text-zinc-500">email</span></p>
          <p>Phone formats: <span className="font-mono text-zinc-500">(512) 555-1234</span>, <span className="font-mono text-zinc-500">512-555-1234</span>, <span className="font-mono text-zinc-500">5125551234</span></p>
          <p>Duplicate phone numbers are updated (upsert)</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {preview && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{fileName}</p>
              <p className="text-xs text-zinc-500">
                {preview.length} valid lead{preview.length !== 1 ? "s" : ""}
                {skipped > 0 && (
                  <span className="text-orange-400 ml-2">
                    ({skipped} skipped — invalid phone or duplicate)
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPreview(null);
                  setFileName("");
                  setSkipped(0);
                }}
                className="rounded px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={uploading}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload & Start Calling"}
              </button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">Email</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {preview.slice(0, 10).map((lead, i) => (
                  <tr key={i} className="border-t border-zinc-800">
                    <td className="py-1.5">{lead.name}</td>
                    <td className="py-1.5 font-mono text-xs">{formatPhone(lead.phone)}</td>
                    <td className="py-1.5 text-zinc-500">
                      {lead.email || "—"}
                    </td>
                  </tr>
                ))}
                {preview.length > 10 && (
                  <tr className="border-t border-zinc-800">
                    <td colSpan={3} className="py-1.5 text-zinc-500 text-xs">
                      ...and {preview.length - 10} more
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
