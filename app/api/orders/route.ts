import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getActiveTenantId } from '@/lib/tenant-access';
import { sendOrderStatusSMS, smsEnabled } from '@/lib/notifications/sms';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active restaurant ID from header
    const activeRestaurantId = request.headers.get('x-active-restaurant-id');

    const access = await getActiveTenantId(userId, activeRestaurantId);

    if (!access) {
      return NextResponse.json({ error: 'No access to restaurant' }, { status: 403 });
    }

    // Fetch all orders for this tenant, ordered by newest first
    const orders = await prisma.orders.findMany({
      where: { tenant_id: access.tenantId },
      orderBy: { created_at: 'desc' }
    });

    // Transform to match expected format
    const formattedOrders = orders.map(order => ({
      id: order.id,
      customerName: order.customer_name,
      phoneNumber: order.customer_phone,
      customerPhone: order.customer_phone,
      items: order.items,
      total: Number(order.total_amount),
      totalAmount: Number(order.total_amount),
      status: order.status,
      timestamp: order.created_at?.toISOString(),
      createdAt: order.created_at?.toISOString(),
      pickupTime: order.pickup_time,
      notes: order.notes
    }));

    return NextResponse.json(formattedOrders);
  } catch (error: any) {
    console.error('Error reading orders:', error);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active restaurant ID from header
    const activeRestaurantId = request.headers.get('x-active-restaurant-id');

    const access = await getActiveTenantId(userId, activeRestaurantId);

    if (!access) {
      return NextResponse.json({ error: 'No access to restaurant' }, { status: 403 });
    }

    const newOrder = await request.json();

    const tenant = await prisma.tenants.findUnique({
      where: { id: access.tenantId },
      select: { twilio_phone_number: true }
    });
    const tenantFromNumber = tenant?.twilio_phone_number || undefined;

    // Create order in database
    const order = await prisma.orders.create({
      data: {
        tenant_id: access.tenantId,
        customer_name: newOrder.customerName,
        customer_phone: newOrder.customerPhone || '',
        items: newOrder.items,
        total_amount: newOrder.totalAmount,
        status: newOrder.status || 'undealt',
        source: 'web',
        pickup_time: newOrder.pickupTime,
        notes: newOrder.notes
      }
    });

    console.log('✅ Order added successfully:', order.id);

    const status = order.status || 'undealt';
    if (smsEnabled(tenantFromNumber)) {
      void sendOrderStatusSMS(
        {
          id: order.id,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          pickup_time: order.pickup_time,
          status,
        },
        status,
        tenantFromNumber
      );
    }
    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Error adding order:', error);
    return NextResponse.json({ error: 'Failed to add order' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active restaurant ID from header
    const activeRestaurantId = request.headers.get('x-active-restaurant-id');

    const access = await getActiveTenantId(userId, activeRestaurantId);

    if (!access) {
      return NextResponse.json({ error: 'No access to restaurant' }, { status: 403 });
    }

    // Delete all orders for this tenant
    await prisma.orders.deleteMany({
      where: { tenant_id: access.tenantId }
    });

    console.log('✅ All orders cleared');
    return NextResponse.json({ success: true, message: 'Orders cleared' });
  } catch (error) {
    console.error('Error clearing orders:', error);
    return NextResponse.json({ error: 'Failed to clear orders' }, { status: 500 });
  }
}
