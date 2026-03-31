import Retell from "retell-sdk";
import { getRequiredSetting } from "@/lib/settings";
import type { LlmCreateParams } from "retell-sdk/resources/llm";

const WEBHOOK_URL = "https://superfluffer.byldr.co/api/retell/webhook";

const DEFAULT_PROMPT = `You are a friendly, natural-sounding caller working on behalf of a real estate agent. You're reaching out to homeowners who previously had their property listed for sale but took it off the market.

Your goal is to book a quick 15-minute meeting with the homeowner so the agent can walk them through a strategy to get their home sold at a strong price — even in the current market.

## How to handle the call

1. **Open casually.** After your greeting, mention that you noticed their home was on the market and ask if they're still thinking about selling. Don't be pushy — be curious and empathetic.

2. **Acknowledge their situation.** Many of these homeowners pulled their listing because it wasn't getting offers, the timing felt wrong, or they got frustrated with the process. Validate that. Say something like "totally understand, that happens more than you'd think."

3. **Tease the strategy.** Mention that the agent you work with has been getting results for homeowners in similar situations — homes that sat or were pulled — by using a different approach. Don't go into detail. The point is to create curiosity, not to pitch on the phone.

4. **Ask for the meeting.** Suggest a quick 15-minute call or Zoom with the agent. Frame it as low-commitment: "no pressure at all, just a quick conversation to see if it even makes sense for your situation." If they're interested, use the check_availability tool to find a time, then book_appointment to confirm it.

5. **Handle objections gently:**
   - "I'm not interested in selling anymore" → "Totally get it. Would it hurt to just hear what the strategy is? Worst case you're more informed for whenever you do decide."
   - "I already have an agent" → "No worries at all. This is really just a second opinion — takes 15 minutes and there's zero obligation."
   - "What's the strategy?" → "It's a positioning approach the agent walks through — I'd butcher it if I tried to explain it, which is why he does the calls himself. It's really just 15 minutes."
   - "I'm busy" → "Totally understand. What day this week works best for a quick call? Even 10 minutes."

6. **If they say yes**, use the check_availability and book_appointment tools to schedule it right on the call. Confirm the time with them before booking.

7. **If they firmly decline**, be gracious. Thank them for their time and wish them well, then end the call.

## Tone
- Sound like a real person, not a robot or a script reader
- Use filler words occasionally ("yeah," "honestly," "for sure")
- Match their energy — if they're short, be concise; if they're chatty, engage
- Never be aggressive or salesy. The vibe is helpful neighbor, not telemarketer.

## Variables
- The lead's name: {{lead_name}}
- Scheduling link (if available): {{cal_com_link}}`;

const DEFAULT_WELCOME = "Hey {{lead_name}}, this is Sarah — how's it going?";

export async function getRetellClient() {
  const apiKey = await getRequiredSetting("RETELL_API_KEY");
  return new Retell({ apiKey });
}

/**
 * Build the tools array for an LLM, including Cal.com if configured.
 */
function buildLlmTools(calConfig?: {
  calApiKey: string;
  eventTypeId: string;
  timezone?: string;
}): LlmCreateParams["general_tools"] {
  const tools: LlmCreateParams["general_tools"] = [
    {
      type: "end_call",
      name: "end_call",
      description: "End the call when the conversation is complete, the lead has firmly declined, or there's nothing more to discuss.",
    },
  ];

  if (calConfig?.calApiKey && calConfig?.eventTypeId) {
    const eventTypeId = parseInt(calConfig.eventTypeId);
    tools.push({
      type: "check_availability_cal",
      name: "check_availability",
      description: "Check available time slots on the calendar for scheduling a meeting. Use this when the lead is interested in booking.",
      cal_api_key: calConfig.calApiKey,
      event_type_id: eventTypeId,
      timezone: calConfig.timezone,
    });
    tools.push({
      type: "book_appointment_cal",
      name: "book_appointment",
      description: "Book an appointment on the calendar once the lead has confirmed a time slot. Always confirm the time with the lead before booking.",
      cal_api_key: calConfig.calApiKey,
      event_type_id: eventTypeId,
      timezone: calConfig.timezone,
    });
  }

  return tools;
}

/**
 * Create a Retell LLM + Agent for a client (no phone number).
 */
export async function provisionRetellAgent(config: {
  name: string;
  prompt?: string;
  welcomeMessage?: string;
  voiceId?: string;
  calApiKey?: string;
  calEventTypeId?: string;
  timezone?: string;
}): Promise<{ agentId: string; llmId: string }> {
  const retell = await getRetellClient();

  const tools = buildLlmTools(
    config.calApiKey && config.calEventTypeId
      ? { calApiKey: config.calApiKey, eventTypeId: config.calEventTypeId, timezone: config.timezone }
      : undefined,
  );

  const llm = await retell.llm.create({
    general_prompt: config.prompt || DEFAULT_PROMPT,
    begin_message: config.welcomeMessage || DEFAULT_WELCOME,
    general_tools: tools,
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
  calApiKey?: string;
  calEventTypeId?: string;
  timezone?: string;
}): Promise<void> {
  const retell = await getRetellClient();

  const tools = buildLlmTools(
    config.calApiKey && config.calEventTypeId
      ? { calApiKey: config.calApiKey, eventTypeId: config.calEventTypeId, timezone: config.timezone }
      : undefined,
  );

  await retell.llm.update(config.llmId, {
    general_prompt: config.prompt,
    begin_message: config.welcomeMessage || null,
    general_tools: tools,
  });

  await retell.agent.update(config.agentId, {
    agent_name: config.name,
    voice_id: config.voiceId || undefined,
    webhook_url: WEBHOOK_URL,
  });
}
