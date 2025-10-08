import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const STATUS_FILE = path.join(process.cwd(), 'restaurant-status.json');

export async function GET() {
  try {
    const statusData = await fs.readFile(STATUS_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(statusData));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // If file doesn't exist, create it with default open status
      const defaultStatus = { isOpen: true, lastUpdated: new Date().toISOString() };
      await fs.writeFile(STATUS_FILE, JSON.stringify(defaultStatus, null, 2), 'utf-8');
      return NextResponse.json(defaultStatus);
    }
    console.error('Error reading restaurant status:', error);
    return NextResponse.json({ error: 'Failed to load status' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { isOpen } = await request.json();

    const status = {
      isOpen,
      lastUpdated: new Date().toISOString()
    };

    await fs.writeFile(STATUS_FILE, JSON.stringify(status, null, 2), 'utf-8');
    console.log('✅ Restaurant status updated:', isOpen ? 'OPEN' : 'CLOSED');

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error updating restaurant status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
