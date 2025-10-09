import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const updatedOrders = await request.json();

    // Update each order in the database
    for (const order of updatedOrders) {
      await prisma.orders.update({
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
    }

    console.log('✅ Orders updated');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating orders:', error);
    return NextResponse.json({ error: 'Failed to update orders' }, { status: 500 });
  }
}
