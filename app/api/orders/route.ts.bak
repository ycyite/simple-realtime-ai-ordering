import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Get the first active tenant (single-tenant mode for now)
    const tenant = await prisma.tenants.findFirst({
      where: { status: 'active' }
    });

    if (!tenant) {
      return NextResponse.json([]);
    }

    // Fetch all orders for this tenant, ordered by newest first
    const orders = await prisma.orders.findMany({
      where: { tenant_id: tenant.id },
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
    const tenant = await prisma.tenants.findFirst({
      where: { status: 'active' }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 404 });
    }

    const newOrder = await request.json();

    // Create order in database
    const order = await prisma.orders.create({
      data: {
        tenant_id: tenant.id,
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

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Error adding order:', error);
    return NextResponse.json({ error: 'Failed to add order' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const tenant = await prisma.tenants.findFirst({
      where: { status: 'active' }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 404 });
    }

    // Delete all orders for this tenant
    await prisma.orders.deleteMany({
      where: { tenant_id: tenant.id }
    });

    console.log('✅ All orders cleared');
    return NextResponse.json({ success: true, message: 'Orders cleared' });
  } catch (error) {
    console.error('Error clearing orders:', error);
    return NextResponse.json({ error: 'Failed to clear orders' }, { status: 500 });
  }
}
