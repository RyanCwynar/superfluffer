interface ClientSchedule {
  timezone: string;
  callWindowStart: string | null;
  callWindowEnd: string | null;
  callDays: string | null;
}

const DAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

function getClientNow(timezone: string): Date {
  const now = new Date();
  const str = now.toLocaleString("en-US", { timeZone: timezone });
  return new Date(str);
}

function parseTime(hhmm: string): { h: number; m: number } {
  const [h, m] = hhmm.split(":").map(Number);
  return { h, m };
}

/**
 * Check if the current time in the client's timezone is within their call window.
 */
export function isInCallWindow(client: ClientSchedule): boolean {
  const now = getClientNow(client.timezone);
  const dayName = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getDay()];
  const allowedDays = (client.callDays ?? "mon,tue,wed,thu,fri").split(",").map((d) => d.trim());

  if (!allowedDays.includes(dayName)) return false;

  const start = parseTime(client.callWindowStart ?? "09:00");
  const end = parseTime(client.callWindowEnd ?? "17:00");
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = start.h * 60 + start.m;
  const endMinutes = end.h * 60 + end.m;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Get the next valid call window start as a UTC Date.
 */
export function getNextCallWindowStart(client: ClientSchedule): Date {
  const allowedDays = (client.callDays ?? "mon,tue,wed,thu,fri").split(",").map((d) => d.trim());
  const start = parseTime(client.callWindowStart ?? "09:00");

  // Start from now in client timezone, find next valid day+time
  const now = getClientNow(client.timezone);
  const candidate = new Date(now);
  candidate.setHours(start.h, start.m, 0, 0);

  // If today is a valid day but the window already passed, move to tomorrow
  const todayName = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][candidate.getDay()];
  if (allowedDays.includes(todayName) && candidate > now) {
    // Today's window hasn't started yet — use it
  } else {
    // Move to next valid day
    candidate.setDate(candidate.getDate() + 1);
    for (let i = 0; i < 7; i++) {
      const dayName = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][candidate.getDay()];
      if (allowedDays.includes(dayName)) break;
      candidate.setDate(candidate.getDate() + 1);
    }
  }

  // Convert back to UTC: the candidate is in client timezone,
  // we need the UTC equivalent
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: client.timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });

  // Calculate offset between client time and UTC
  const utcNow = new Date();
  const clientNow = getClientNow(client.timezone);
  const offsetMs = clientNow.getTime() - utcNow.getTime();

  return new Date(candidate.getTime() - offsetMs);
}
