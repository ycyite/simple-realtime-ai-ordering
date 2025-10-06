import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const MENU_FILE = path.join(process.cwd(), 'menu.json');

export async function GET() {
  try {
    const menuData = await fs.readFile(MENU_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(menuData));
  } catch (error) {
    console.error('Error reading menu:', error);
    return NextResponse.json({ error: 'Failed to load menu' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const menuData = await request.json();
    await fs.writeFile(MENU_FILE, JSON.stringify(menuData, null, 2), 'utf-8');
    console.log('✅ Menu updated successfully');
    return NextResponse.json({ success: true, message: 'Menu updated' });
  } catch (error) {
    console.error('Error updating menu:', error);
    return NextResponse.json({ error: 'Failed to update menu' }, { status: 500 });
  }
}
