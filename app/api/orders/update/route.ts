import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const ORDERS_FILE = path.join(process.cwd(), 'orders.json');

export async function POST(request: Request) {
  try {
    const updatedOrders = await request.json();
    await fs.writeFile(ORDERS_FILE, JSON.stringify(updatedOrders, null, 2), 'utf-8');
    console.log('✅ Orders updated');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating orders:', error);
    return NextResponse.json({ error: 'Failed to update orders' }, { status: 500 });
  }
}
