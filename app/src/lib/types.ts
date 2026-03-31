export interface Client {
  id: number;
  name: string;
  slug: string;
  industry: string;
  timezone: string;
  retellAgentId: string | null;
  retellLlmId: string | null;
  retellPhoneNumber: string | null;
  agentPrompt: string | null;
  agentVoiceId: string | null;
  agentWelcomeMessage: string | null;
  calComApiKey: string | null;
  calComEventSlug: string | null;
  calComEventTypeId: string | null;
  callWindowStart: string | null;
  callWindowEnd: string | null;
  callDays: string | null;
  active: boolean;
  createdAt: string | null;
}

export interface Batch {
  id: number;
  fileName: string;
  uploadedAt: string | null;
  totalLeads: number;
  status: string;
  clientId: number;
}

export interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  status: string;
  callAttempts: number;
  nextRetryAt: string | null;
  appointmentTime: string | null;
  calendarEventId: string | null;
  batchId: number | null;
  clientId: number;
  createdAt: string | null;
}

export interface Call {
  id: number;
  leadId: number;
  clientId: number;
  retellCallId: string | null;
  status: string;
  transcript: string | null;
  summary: string | null;
  duration: number | null;
  disconnectionReason: string | null;
  attemptNumber: number;
  calledAt: string | null;
  createdAt: string | null;
}
