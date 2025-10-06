import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const ORDERS_FILE = path.join(process.cwd(), 'orders.json');

export async function GET() {
  try {
    const ordersData = await fs.readFile(ORDERS_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(ordersData));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json([]);
    } else {
      console.error('Error reading orders:', error);
      return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
    }
  }
}

export async function POST(request: Request) {
  try {
    let orders = [];

    // Read existing orders
    try {
      const ordersData = await fs.readFile(ORDERS_FILE, 'utf-8');
      orders = JSON.parse(ordersData);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    const newOrder = await request.json();

    // Add new order with timestamp and ID
    const orderWithMeta = {
      ...newOrder,
      timestamp: new Date().toISOString(),
      id: `order-${Date.now()}`
    };

    orders.push(orderWithMeta);

    // Save updated orders
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
    console.log('✅ Order added successfully:', orderWithMeta.id);

    return NextResponse.json({ success: true, order: orderWithMeta });
  } catch (error) {
    console.error('Error adding order:', error);
    return NextResponse.json({ error: 'Failed to add order' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await fs.writeFile(ORDERS_FILE, JSON.stringify([], null, 2), 'utf-8');
    console.log('✅ All orders cleared');
    return NextResponse.json({ success: true, message: 'Orders cleared' });
  } catch (error) {
    console.error('Error clearing orders:', error);
    return NextResponse.json({ error: 'Failed to clear orders' }, { status: 500 });
  }
}
