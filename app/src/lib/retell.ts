import Retell from "retell-sdk";

export function getRetellClient() {
  return new Retell({ apiKey: process.env.RETELL_API_KEY! });
}

export async function verifyRetellSignature(
  body: string,
  apiKey: string,
  signature: string,
): Promise<boolean> {
  const match = signature.match(/v=(\d+),d=(.*)/);
  if (!match) return false;

  const timestamp = match[1];
  const digest = match[2];

  if (Math.abs(Date.now() - parseInt(timestamp)) > 5 * 60 * 1000) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body + timestamp),
  );

  const computed = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === digest;
}
