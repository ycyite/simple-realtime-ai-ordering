/**
 * Time and timezone utilities for handling pickup times
 */

/**
 * Maps Canadian postal code prefixes to timezone identifiers
 * Based on first letter of postal code (FSA - Forward Sortation Area)
 */
const CANADIAN_POSTAL_TIMEZONE_MAP: Record<string, string> = {
  // Newfoundland and Labrador
  A: 'America/St_Johns', // UTC-3:30

  // Nova Scotia, Prince Edward Island, New Brunswick
  B: 'America/Halifax', // Atlantic Time UTC-4

  // Quebec (most), Eastern Ontario
  G: 'America/Toronto', // Eastern Time UTC-5
  H: 'America/Toronto',
  J: 'America/Toronto',
  K: 'America/Toronto',
  L: 'America/Toronto',
  M: 'America/Toronto',
  N: 'America/Toronto',
  P: 'America/Toronto',

  // Manitoba
  R: 'America/Winnipeg', // Central Time UTC-6

  // Saskatchewan
  S: 'America/Regina', // Central Time UTC-6 (no DST)

  // Alberta, Northwest Territories, Nunavut (Mountain)
  T: 'America/Edmonton', // Mountain Time UTC-7
  X: 'America/Edmonton',

  // British Columbia, Yukon
  V: 'America/Vancouver', // Pacific Time UTC-8
  Y: 'America/Whitehorse',
};

/**
 * Detects timezone from postal code
 * Supports Canadian postal codes (e.g., "M5V 3A8", "V6B 1A1")
 * Returns IANA timezone identifier or defaults to America/Toronto
 */
export function getTimezoneFromPostalCode(postalCode: string): string {
  if (!postalCode) return 'America/Toronto'; // Default to Eastern Time

  // Extract first letter (FSA) from postal code
  const firstLetter = postalCode.trim().charAt(0).toUpperCase();

  return CANADIAN_POSTAL_TIMEZONE_MAP[firstLetter] || 'America/Toronto';
}

/**
 * Formats a pickup time string to standard format: "hh:mm a.m./p.m. - dd/MM/YY"
 * Handles various input formats:
 * - "30 minutes" or "30 mins" -> calculates from current time
 * - "1 hour" or "2 hours" -> calculates from current time
 * - "8pm" or "8:30 PM" -> today at that time
 * - "tomorrow at 2pm" -> tomorrow at that time
 *
 * @param rawTime - The raw pickup time string from customer
 * @param timezone - IANA timezone identifier (e.g., "America/Toronto")
 * @returns Formatted time string in format "hh:mm a.m./p.m. - dd/MM/YY"
 */
export function formatPickupTime(rawTime: string, timezone: string = 'America/Toronto'): string {
  if (!rawTime) return '';

  const input = rawTime.toLowerCase().trim();
  let targetDate: Date;

  try {
    // Get current time in the tenant's timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    // Parse current time in tenant timezone
    const parts = formatter.formatToParts(now);
    const tzYear = parseInt(parts.find(p => p.type === 'year')?.value || '2025');
    const tzMonth = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
    const tzDay = parseInt(parts.find(p => p.type === 'day')?.value || '1');
    const tzHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const tzMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');

    targetDate = new Date(tzYear, tzMonth, tzDay, tzHour, tzMinute);

    // Pattern: "X minutes" or "X mins"
    const minutesMatch = input.match(/(\d+)\s*(minute|min)/);
    if (minutesMatch) {
      const minutes = parseInt(minutesMatch[1]);
      targetDate.setMinutes(targetDate.getMinutes() + minutes);
    }
    // Pattern: "X hour(s)"
    else if (input.match(/(\d+)\s*hour/)) {
      const hoursMatch = input.match(/(\d+)\s*hour/);
      const hours = parseInt(hoursMatch![1]);
      targetDate.setHours(targetDate.getHours() + hours);
    }
    // Pattern: "tomorrow" - add 1 day
    else if (input.includes('tomorrow')) {
      targetDate.setDate(targetDate.getDate() + 1);

      // Try to extract time from "tomorrow at 2pm"
      const timeMatch = input.match(/(\d+)(?::(\d+))?\s*(am|pm|a\.m\.|p\.m\.)?/);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const meridiem = timeMatch[3]?.toLowerCase().replace(/\./g, '');

        if (meridiem === 'pm' && hour !== 12) hour += 12;
        if (meridiem === 'am' && hour === 12) hour = 0;

        targetDate.setHours(hour, minute, 0, 0);
      }
    }
    // Pattern: time like "8pm", "2:30pm", "14:00"
    else {
      const timeMatch = input.match(/(\d+)(?::(\d+))?\s*(am|pm|a\.m\.|p\.m\.)?/);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const meridiem = timeMatch[3]?.toLowerCase().replace(/\./g, '');

        // Convert 12-hour to 24-hour
        if (meridiem === 'pm' && hour !== 12) {
          hour += 12;
        } else if (meridiem === 'am' && hour === 12) {
          hour = 0;
        }

        targetDate.setHours(hour, minute, 0, 0);

        // If the time is in the past today, assume tomorrow
        if (targetDate < now) {
          targetDate.setDate(targetDate.getDate() + 1);
        }
      }
    }

    // Format output: "hh:mm a.m./p.m. - dd/MM/YY"
    const hours = targetDate.getHours();
    const minutes = targetDate.getMinutes();
    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const year = String(targetDate.getFullYear()).slice(-2);

    // Convert to 12-hour format
    let displayHour = hours % 12;
    if (displayHour === 0) displayHour = 12;
    const displayMinute = String(minutes).padStart(2, '0');
    const meridiem = hours >= 12 ? 'p.m.' : 'a.m.';

    return `${displayHour}:${displayMinute} ${meridiem} - ${day}/${month}/${year}`;

  } catch (error) {
    console.error('Error formatting pickup time:', error);
    // Return original if parsing fails
    return rawTime;
  }
}
