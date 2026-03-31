export interface Client {
  id: number;
  name: string;
  slug: string;
  industry: string;
  timezone: string;
  retellAgentId: string;
  retellPhoneNumber: string;
  calComEventSlug: string | null;
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
