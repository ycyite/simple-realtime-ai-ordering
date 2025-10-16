import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveTenantId } from '@/lib/tenant-access';
import { auth } from '@clerk/nextjs/server';

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
      return NextResponse.json({ isOpen: true, lastUpdated: new Date().toISOString() });
    }

    const tenant = await prisma.tenants.findUnique({
      where: { id: access.tenantId }
    });

    if (!tenant) {
      return NextResponse.json({ isOpen: true, lastUpdated: new Date().toISOString() });
    }

    return NextResponse.json({
      isOpen: tenant.is_open ?? true,
      lastUpdated: tenant.updated_at?.toISOString() || new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error reading restaurant status:', error);
    return NextResponse.json({ error: 'Failed to load status' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isOpen } = await request.json();

    // Get active restaurant ID from header
    const activeRestaurantId = request.headers.get('x-active-restaurant-id');

    const access = await getActiveTenantId(userId, activeRestaurantId);

    if (!access) {
      return NextResponse.json({ error: 'No tenant access' }, { status: 403 });
    }

    // Update tenant status
    const tenant = await prisma.tenants.update({
      where: { id: access.tenantId },
      data: {
        is_open: isOpen,
        updated_at: new Date()
      }
    });

    console.log('✅ Restaurant status updated:', isOpen ? 'OPEN' : 'CLOSED');

    return NextResponse.json({
      isOpen: tenant.is_open ?? true,
      lastUpdated: tenant.updated_at?.toISOString() || new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating restaurant status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
