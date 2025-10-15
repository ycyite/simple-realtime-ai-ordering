import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusSMS, smsEnabled } from '@/lib/notifications/sms';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const updatedOrders = await request.json();

    const tenantNumberCache = new Map<string, string | null>();

    for (const order of updatedOrders) {
      const before = await prisma.orders.findUnique({ where: { id: order.id } });
      const updated = await prisma.orders.update({
        where: { id: order.id },
        data: {
          status: order.status,
          customer_name: order.customerName,
          customer_phone: order.phoneNumber || order.customerPhone,
          items: order.items,
          total_amount: order.total || order.totalAmount,
          pickup_time: order.pickupTime,
          notes: order.notes
        }
      });
      let tenantFromNumber: string | undefined;
      const tenantId = updated.tenant_id ?? before?.tenant_id;
      if (tenantId) {
        if (!tenantNumberCache.has(tenantId)) {
          const tenant = await prisma.tenants.findUnique({
            where: { id: tenantId },
            select: { twilio_phone_number: true }
          });
          tenantNumberCache.set(tenantId, tenant?.twilio_phone_number || null);
        }
        tenantFromNumber = tenantNumberCache.get(tenantId) || undefined;
      }

      if (order.status && before?.status !== order.status && smsEnabled(tenantFromNumber)) {
        void sendOrderStatusSMS(
          {
            id: updated.id,
            customer_name: updated.customer_name,
            customer_phone: updated.customer_phone,
            pickup_time: updated.pickup_time,
            status: updated.status,
          },
          order.status,
          tenantFromNumber
        );
      }
    }

    console.log('✅ Orders updated');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating orders:', error);
    return NextResponse.json({ error: 'Failed to update orders' }, { status: 500 });
  }
}
