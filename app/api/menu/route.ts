import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const user = await prisma.users.findUnique({
      where: { clerk_user_id: userId },
      select: { tenant_id: true }
    });

    if (!user?.tenant_id) {
      return NextResponse.json({ categories: [] });
    }

    // Get menu items for this tenant
    const menuItems = await prisma.menu_items.findMany({
      where: { tenant_id: user.tenant_id },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Group by category
    const groupedMenu = menuItems.reduce((acc: any, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        id: item.id,
        name: item.name,
        description: item.description,
        price: parseFloat(item.price.toString()),
        available: item.available,
        image_url: item.image_url
      });
      return acc;
    }, {});

    const categories = Object.keys(groupedMenu).map(name => ({
      name,
      items: groupedMenu[name]
    }));

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error reading menu:', error);
    return NextResponse.json({ error: 'Failed to load menu' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const user = await prisma.users.findUnique({
      where: { clerk_user_id: userId },
      select: { tenant_id: true }
    });

    if (!user?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    const { categories } = await request.json();

    // Delete existing menu items for this tenant
    await prisma.menu_items.deleteMany({
      where: { tenant_id: user.tenant_id }
    });

    // Insert new menu items
    const menuItems = categories.flatMap((category: any) =>
      category.items.map((item: any) => ({
        tenant_id: user.tenant_id,
        name: item.name,
        description: item.description || null,
        price: item.price,
        category: category.name,
        available: item.available ?? true,
        image_url: item.image_url || null
      }))
    );

    if (menuItems.length > 0) {
      await prisma.menu_items.createMany({
        data: menuItems
      });
    }

    console.log('✅ Menu updated successfully');
    return NextResponse.json({ success: true, message: 'Menu updated' });
  } catch (error) {
    console.error('Error updating menu:', error);
    return NextResponse.json({ error: 'Failed to update menu' }, { status: 500 });
  }
}
