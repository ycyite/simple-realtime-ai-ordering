/**
 * Generates a custom order number based on customer phone and timestamp
 * Format: [last 3 digits of phone]-[YYYYMMDDHHMMSSMS]
 * Example: 321-20250429192355600
 */
export function generateOrderNumber(phoneNumber: string): string {
  // Extract last 3 digits from phone number (remove non-digits first)
  const digits = phoneNumber.replace(/\D/g, '');
  const lastThree = digits.slice(-3).padStart(3, '0');

  // Generate timestamp: YYYYMMDDHHMMSSMS
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

  const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;

  return `${lastThree}-${timestamp}`;
}
