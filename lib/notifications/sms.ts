import twilio from 'twilio';

type OrderLike = {
  id: string;
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
  switch (newStatus) {
    case 'undealt':
      return `${name}, we received your order (${o.id}). We will confirm shortly.`;
    case 'preparing':
      return `${name}, your order (${o.id}) is confirmed and being prepared.`;
    case 'ready':
      return `${name}, your order (${o.id}) is ready for pickup${o.pickup_time ? ` around ${o.pickup_time}` : ''}.`;
    case 'completed':
      return `${name}, your order (${o.id}) is completed. Thank you!`;
    case 'cancelled':
      return `${name}, your order (${o.id}) has been cancelled. If this is unexpected, please contact us.`;
    default:
      return `${name}, your order (${o.id}) status updated: ${newStatus}.`;
  }
}

export async function sendOrderStatusSMS(order: OrderLike, newStatus: string, fromOverride?: string) {
  if (!client) return;
  const to = order.customer_phone;
  if (!to || !to.startsWith('+')) return;
  const from = fromOverride || defaultFromNumber;
  if (!from) return;
  const body = buildMessage(order, newStatus);
  try {
    await client.messages.create({ to, from, body });
  } catch (err) {
    console.error('Failed to send SMS:', err);
  }
}
