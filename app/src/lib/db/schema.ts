import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
  hashedKey: text("hashed_key").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  category: text("category").notNull().default("general"),
  sensitive: boolean("sensitive").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  industry: text("industry").notNull(),
  timezone: text("timezone").notNull(),
  retellAgentId: text("retell_agent_id").notNull(),
  retellPhoneNumber: text("retell_phone_number").notNull(),
  calComEventSlug: text("cal_com_event_slug"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  totalLeads: integer("total_leads").notNull(),
  status: text("status").notNull().default("processing"),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  source: text("source"),
  status: text("status").notNull().default("new"),
  callAttempts: integer("call_attempts").notNull().default(0),
  nextRetryAt: timestamp("next_retry_at"),
  appointmentTime: text("appointment_time"),
  calendarEventId: text("calendar_event_id"),
  batchId: integer("batch_id")
    .references(() => batches.id),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("leads_phone_client_idx").on(table.phone, table.clientId),
]);

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  retellCallId: text("retell_call_id"),
  status: text("status").notNull().default("initiated"),
  transcript: text("transcript"),
  summary: text("summary"),
  duration: integer("duration"),
  disconnectionReason: text("disconnection_reason"),
  attemptNumber: integer("attempt_number").notNull(),
  calledAt: timestamp("called_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});
