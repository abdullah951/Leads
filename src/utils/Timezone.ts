/**
 * Timezone utilities for credit reset scheduling.
 * All helpers are pure functions with no side effects.
 */

/**
 * Validates an IANA timezone string by attempting to use it in Intl.
 * Returns the timezone unchanged if valid, or 'UTC' if invalid/missing.
 *
 * @param tz - The timezone string to validate (e.g. 'America/New_York').
 * @returns A valid IANA timezone string.
 */
export function sanitizeTimezone(tz: string | undefined | null): string {
  if (!tz) return 'UTC';
  try {
    // Intl throws RangeError for unrecognised timezone identifiers
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

/**
 * Returns the UTC Date that corresponds to 00:00:00 (midnight) of the NEXT
 * calendar day in the given IANA timezone.
 *
 * Example: if it is currently 23:50 in 'Asia/Karachi' (UTC+5), this returns
 * the UTC instant that is 00:00:00 tomorrow in Karachi — i.e. 19:00 UTC today.
 *
 * @param timezone - A valid IANA timezone name (use sanitizeTimezone first).
 * @returns UTC Date representing the next local midnight in that timezone.
 */
export function nextLocalMidnightUtc(timezone: string): Date {
  const now = new Date();

  // Step 1: Find today's date components in the target timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find(p => p.type === 'year')!.value);
  const month = Number(parts.find(p => p.type === 'month')!.value); // 1-based
  const day = Number(parts.find(p => p.type === 'day')!.value);

  // Step 2: Build "tomorrow 00:00:00" as a naive UTC instant (no tz offset yet)
  const tomorrowStr = [
    year,
    String(month).padStart(2, '0'),
    String(day + 1).padStart(2, '0'), // day+1 handles month/year roll-over correctly via Date parsing
  ].join('-');
  const naiveUtc = new Date(`${tomorrowStr}T00:00:00Z`);

  // Step 3: Find the UTC offset at that naive instant in the target timezone.
  // We render the naive UTC time as local time parts, then compute how many
  // milliseconds separate it from true midnight.
  const localTimeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(naiveUtc);

  const localHour = Number(localTimeParts.find(p => p.type === 'hour')!.value);
  const localMin = Number(localTimeParts.find(p => p.type === 'minute')!.value);
  const localSec = Number(localTimeParts.find(p => p.type === 'second')!.value);

  // The offset between UTC and local time at that instant (in ms).
  // e.g. if naiveUtc shows as 05:00 local, we need to subtract 5h to reach 00:00.
  const offsetMs = (localHour * 3600 + localMin * 60 + localSec) * 1000;

  // Step 4: Subtract the offset to land on the UTC instant that IS 00:00:00 local
  return new Date(naiveUtc.getTime() - offsetMs);
}
