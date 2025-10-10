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

    // Get user's tenant
    const user = await prisma.users.findUnique({
      where: { clerk_user_id: userId },
      include: { tenants: true }
    });

    if (!user?.tenants) {
      return NextResponse.json({ isOpen: true, lastUpdated: new Date().toISOString() });
    }

    return NextResponse.json({
      isOpen: user.tenants.is_open ?? true,
      lastUpdated: user.tenants.updated_at?.toISOString() || new Date().toISOString()
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

    // Get user's tenant
    const user = await prisma.users.findUnique({
      where: { clerk_user_id: userId },
      select: { tenant_id: true }
    });

    if (!user?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    // Update tenant status
    const tenant = await prisma.tenants.update({
      where: { id: user.tenant_id },
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
