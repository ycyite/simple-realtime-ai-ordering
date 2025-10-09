import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Get restaurant settings
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const user = await prisma.users.findUnique({
      where: { clerk_user_id: userId },
      include: { tenants: true }
    });

    if (!user?.tenants) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    const tenant = user.tenants;

    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      phone: tenant.phone_number || '',
      address: tenant.address || '',
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// Update restaurant settings
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phone, address } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Restaurant name is required' }, { status: 400 });
    }

    // Get user's tenant
    const user = await prisma.users.findUnique({
      where: { clerk_user_id: userId },
      select: { tenant_id: true }
    });

    if (!user?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    // Update tenant information
    await prisma.tenants.update({
      where: { id: user.tenant_id },
      data: {
        name,
        phone_number: phone || null,
        address: address || null,
        updated_at: new Date()
      }
    });

    console.log(`✅ Updated settings for tenant ${user.tenant_id}`);

    return NextResponse.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
