import Retell from "retell-sdk";
import { getRequiredSetting } from "@/lib/settings";

const WEBHOOK_URL = "https://superfluffer.byldr.co/api/retell/webhook";

const DEFAULT_PROMPT = `You are a friendly and professional appointment setter. Your goal is to schedule a meeting with the person you're calling.

Key guidelines:
- Be warm, conversational, and respectful of their time
- Introduce yourself and explain why you're calling
- If they're interested, offer to schedule an appointment
- If they mention a preferred time, confirm it
- If they're not interested, thank them and end the call politely
- Keep the conversation natural, don't sound scripted

The lead's name is {{lead_name}}.`;

const DEFAULT_WELCOME = "Hi {{lead_name}}, how are you doing today?";

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
 * Create a Retell LLM + Agent for a client (no phone number).
 */
export async function provisionRetellAgent(config: {
  name: string;
  prompt?: string;
  welcomeMessage?: string;
  voiceId?: string;
}): Promise<{ agentId: string; llmId: string }> {
  const retell = await getRetellClient();

  const llm = await retell.llm.create({
    general_prompt: config.prompt || DEFAULT_PROMPT,
    begin_message: config.welcomeMessage || DEFAULT_WELCOME,
  });

  const agent = await retell.agent.create({
    agent_name: config.name,
    voice_id: config.voiceId || "11labs-Adrian",
    response_engine: {
      type: "retell-llm",
      llm_id: llm.llm_id,
    },
    webhook_url: WEBHOOK_URL,
  });

  return {
    agentId: agent.agent_id,
    llmId: llm.llm_id,
  };
}

/**
 * List all phone numbers on the Retell account.
 */
export async function listRetellPhoneNumbers() {
  const retell = await getRetellClient();
  return retell.phoneNumber.list();
}

/**
 * Assign a phone number to an agent (bind for outbound + inbound).
 */
export async function assignPhoneToAgent(phoneNumber: string, agentId: string) {
  const retell = await getRetellClient();
  await retell.phoneNumber.update(phoneNumber, {
    outbound_agents: [{ agent_id: agentId, weight: 1 }],
    inbound_agents: [{ agent_id: agentId, weight: 1 }],
  });
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
    webhook_url: WEBHOOK_URL,
  });
}
