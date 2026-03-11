import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

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
  status: text("status").notNull().default("pending"),
  callAttempts: integer("call_attempts").notNull().default(0),
  lastCallAt: timestamp("last_call_at"),
  nextRetryAt: timestamp("next_retry_at"),
  retellCallId: text("retell_call_id"),
  appointmentTime: text("appointment_time"),
  calendarEventId: text("calendar_event_id"),
  notes: text("notes"),
  batchId: integer("batch_id")
    .notNull()
    .references(() => batches.id),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  createdAt: timestamp("created_at").defaultNow(),
});
