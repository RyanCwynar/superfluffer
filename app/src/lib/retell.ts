import Retell from "retell-sdk";
import { getRequiredSetting } from "@/lib/settings";

export async function getRetellClient() {
  const apiKey = await getRequiredSetting("RETELL_API_KEY");
  return new Retell({ apiKey });
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

/**
 * Create a new Retell agent + LLM for a client.
 * Returns { agentId, llmId } to store on the client record.
 */
export async function createRetellAgent(config: {
  name: string;
  prompt: string;
  welcomeMessage?: string;
  voiceId?: string;
}): Promise<{ agentId: string; llmId: string }> {
  const retell = await getRetellClient();

  const llm = await retell.llm.create({
    general_prompt: config.prompt,
    begin_message: config.welcomeMessage || null,
  });

  const agent = await retell.agent.create({
    agent_name: config.name,
    voice_id: config.voiceId || "11labs-Adrian",
    response_engine: {
      type: "retell-llm",
      llm_id: llm.llm_id,
    },
  });

  return {
    agentId: agent.agent_id,
    llmId: llm.llm_id,
  };
}

/**
 * Update an existing Retell agent + LLM config.
 */
export async function syncRetellAgent(config: {
  agentId: string;
  llmId: string;
  name: string;
  prompt: string;
  welcomeMessage?: string;
  voiceId?: string;
}): Promise<void> {
  const retell = await getRetellClient();

  await retell.llm.update(config.llmId, {
    general_prompt: config.prompt,
    begin_message: config.welcomeMessage || null,
  });

  await retell.agent.update(config.agentId, {
    agent_name: config.name,
    voice_id: config.voiceId || undefined,
  });
}
