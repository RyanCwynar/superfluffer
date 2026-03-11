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
  lastCallAt: string | null;
  nextRetryAt: string | null;
  retellCallId: string | null;
  appointmentTime: string | null;
  calendarEventId: string | null;
  notes: string | null;
  batchId: number;
  clientId: number;
  createdAt: string | null;
}
