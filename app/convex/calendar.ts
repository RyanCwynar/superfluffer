"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { calendar_v3 } from "@googleapis/calendar";
import { GoogleAuth } from "google-auth-library";

const APPOINTMENT_DURATION_MIN = 15;
const TIMEZONE = "America/Chicago";

function getCalendarClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SA_CREDENTIALS!, "base64").toString(),
  );
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return new calendar_v3.Calendar({ auth });
}

function getWorkingHours(): { start: number; end: number } {
  const start = parseInt(process.env.WORKING_HOURS_START?.replace(":", "") || "0900");
  const end = parseInt(process.env.WORKING_HOURS_END?.replace(":", "") || "1700");
  return {
    start: Math.floor(start / 100) * 60 + (start % 100),
    end: Math.floor(end / 100) * 60 + (end % 100),
  };
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const displayMin = minute === 0 ? "" : `:${String(minute).padStart(2, "0")}`;
  return `${displayHour}${displayMin} ${period}`;
}

function computeAvailableSlots(
  busyBlocks: { start: string; end: string }[],
  dateStr: string,
  workingHours: { start: number; end: number },
): string[] {
  const busy = busyBlocks.map((b) => {
    const s = new Date(b.start);
    const e = new Date(b.end);
    return {
      start: s.getHours() * 60 + s.getMinutes(),
      end: e.getHours() * 60 + e.getMinutes(),
    };
  });

  const slots: string[] = [];
  let cursor = workingHours.start;

  while (cursor + APPOINTMENT_DURATION_MIN <= workingHours.end) {
    const slotEnd = cursor + APPOINTMENT_DURATION_MIN;
    const isConflict = busy.some(
      (b) => cursor < b.end && slotEnd > b.start,
    );

    if (!isConflict) {
      const hour = Math.floor(cursor / 60);
      const minute = cursor % 60;
      slots.push(formatTime(hour, minute));
    }

    cursor += APPOINTMENT_DURATION_MIN;
  }

  return slots;
}

export const getAvailableSlots = internalAction({
  args: { days: v.optional(v.number()) },
  handler: async (_ctx, args): Promise<Record<string, string[]>> => {
    const cal = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID!;
    const workingHours = getWorkingHours();
    const numDays = args.days ?? 3;

    const now = new Date();
    const timeMin = now.toISOString();

    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + numDays);
    const timeMax = endDate.toISOString();

    const freeBusy = await cal.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: TIMEZONE,
        items: [{ id: calendarId }],
      },
    });

    const busyByDate: Record<string, { start: string; end: string }[]> = {};
    const busyBlocks =
      freeBusy.data.calendars?.[calendarId]?.busy ?? [];

    for (const block of busyBlocks) {
      if (!block.start || !block.end) continue;
      const dateKey = new Date(block.start).toLocaleDateString("en-US", {
        timeZone: TIMEZONE,
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      if (!busyByDate[dateKey]) busyByDate[dateKey] = [];
      busyByDate[dateKey].push({ start: block.start, end: block.end });
    }

    const result: Record<string, string[]> = {};
    for (let i = 0; i < numDays; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const dateKey = date.toLocaleDateString("en-US", {
        timeZone: TIMEZONE,
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const dateStr = date.toISOString().split("T")[0];
      result[dateKey] = computeAvailableSlots(
        busyByDate[dateKey] ?? [],
        dateStr,
        workingHours,
      );
    }

    return result;
  },
});

export const bookAppointment = internalAction({
  args: {
    slot: v.string(),
    date: v.string(),
    leadName: v.string(),
    leadPhone: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const cal = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID!;

    // Parse the slot time (e.g., "10 AM", "2:30 PM")
    const timeMatch = args.slot.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (!timeMatch) {
      throw new Error(`Invalid slot format: ${args.slot}`);
    }

    let hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2] || "0");
    const period = timeMatch[3].toUpperCase();

    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    const startTime = `${args.date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
    const endDate = new Date(`${startTime}-06:00`); // CST offset
    endDate.setMinutes(endDate.getMinutes() + APPOINTMENT_DURATION_MIN);
    const endTime = endDate.toISOString().replace("Z", "").split(".")[0];

    // Double-check the slot is still free
    const freeBusy = await cal.freebusy.query({
      requestBody: {
        timeMin: `${startTime}-06:00`,
        timeMax: endDate.toISOString(),
        timeZone: TIMEZONE,
        items: [{ id: calendarId }],
      },
    });

    const conflicts =
      freeBusy.data.calendars?.[calendarId]?.busy ?? [];
    if (conflicts.length > 0) {
      return { success: false, error: "That slot was just taken. Please pick another time." };
    }

    const event = await cal.events.insert({
      calendarId,
      requestBody: {
        summary: `Real Estate Consultation - ${args.leadName}`,
        description: [
          `Lead: ${args.leadName}`,
          `Phone: ${args.leadPhone}`,
          args.notes ? `Notes: ${args.notes}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        start: { dateTime: startTime, timeZone: TIMEZONE },
        end: { dateTime: endTime, timeZone: TIMEZONE },
        extendedProperties: {
          private: {
            leadPhone: args.leadPhone,
            source: "autobook",
          },
        },
      },
    });

    return {
      success: true,
      eventId: event.data.id,
      dateTime: `${args.slot} CST on ${args.date}`,
    };
  },
});
