import twilio from 'twilio';

type OrderLike = {
  id: string;
  order_number?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  pickup_time?: string | null;
  status?: string | null;
};

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const defaultFromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

const hasCredentials = !!(accountSid && authToken);
const client = hasCredentials ? twilio(accountSid!, authToken!) : null;

export function smsEnabled(customFrom?: string) {
  return !!(client && (customFrom || defaultFromNumber));
}

function buildMessage(o: OrderLike, newStatus: string) {
  const name = o.customer_name ? `Hi ${o.customer_name}` : 'Hi';
  const orderRef = o.order_number || o.id;
  switch (newStatus) {
    case 'undealt':
      return `${name}, we received your order (${orderRef}). We will confirm shortly.`;
    case 'preparing':
      return `${name}, your order (${orderRef}) is confirmed and being prepared.`;
    case 'ready':
      return `${name}, your order (${orderRef}) is ready for pickup${o.pickup_time ? ` around ${o.pickup_time}` : ''}.`;
    case 'completed':
      return `${name}, your order (${orderRef}) is completed. Thank you!`;
    case 'cancelled':
      return `${name}, your order (${orderRef}) has been cancelled. If this is unexpected, please contact us.`;
    default:
      return `${name}, your order (${orderRef}) status updated: ${newStatus}.`;
  }
}

export async function sendOrderErrorSMS(phoneNumber: string, fromOverride?: string) {
  if (!client) return;

  const normalizedTo = normalizeE164(phoneNumber);
  if (!normalizedTo) {
    console.warn(`Error SMS skipped: unable to normalize phone (${phoneNumber})`);
    return;
  }

  const from = fromOverride || defaultFromNumber;
  if (!from) {
    console.warn(`Error SMS skipped: no Twilio from number configured`);
    return;
  }

  const body = `We sincerely apologize, but we encountered an issue processing your order. Please call us back at your convenience to place your order. We're sorry for the inconvenience.`;

  try {
    const message = await client.messages.create({ body, from, to: normalizedTo });
    console.log(`Error SMS sent to ${normalizedTo}: ${message.sid}`);
  } catch (err) {
    console.error('Failed to send error SMS:', err);
  }
}

export async function sendOrderStatusSMS(order: OrderLike, newStatus: string, fromOverride?: string) {
  if (!client) return;

  // Don't send SMS for completed orders
  if (newStatus === 'completed') {
    console.log(`SMS skipped for order ${order.id}: status is completed`);
    return;
  }

  const to = order.customer_phone;
  if (!to) {
    console.warn(`SMS skipped for order ${order.id}: missing customer phone`);
    return;
  }
  const normalizedTo = normalizeE164(to);
  if (!normalizedTo) {
    console.warn(`SMS skipped for order ${order.id}: unable to normalize phone (${to})`);
    return;
  }
  const from = fromOverride || defaultFromNumber;
  if (!from) {
    console.warn(`SMS skipped for order ${order.id}: no Twilio from number configured`);
    return;
  }
  const body = buildMessage(order, newStatus);
  try {
    const message = await client.messages.create({ body, from, to: normalizedTo });
    console.log(`SMS sent for order ${order.id} (status ${newStatus}) -> ${normalizedTo}: ${message.sid}`);
  } catch (err) {
    console.error('Failed to send SMS:', err);
  }
}

function normalizeE164(value: string): string | null {
  const trimmed = value.trim();
  if (/^\+\d{10,15}$/.test(trimmed)) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}
