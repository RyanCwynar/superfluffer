/**
 * Normalize a phone number to E.164 format.
 * Assumes US (+1) unless a country code is provided.
 *
 * Accepts: (512) 555-1234, 512-555-1234, 5125551234, +15125551234, 15125551234
 * Returns: +15125551234 or null if invalid
 */
export function normalizePhone(raw: string): string | null {
  // Strip everything except digits and leading +
  const cleaned = raw.replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/\+/g, "");

  // Already has + prefix with country code
  if (cleaned.startsWith("+")) {
    if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
    return null;
  }

  // 10 digits = US number without country code
  if (digits.length === 10) return `+1${digits}`;

  // 11 digits starting with 1 = US with country code
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return null;
}

/**
 * Format an E.164 phone number for display.
 * +15125551234 → (512) 555-1234
 */
export function formatPhone(e164: string): string {
  if (!e164.startsWith("+1") || e164.length !== 12) return e164;
  const d = e164.slice(2);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
