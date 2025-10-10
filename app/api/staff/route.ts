import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getActiveTenantId } from '@/lib/tenant-access';

export const runtime = 'nodejs';

// Get all staff members for the active restaurant
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
      return NextResponse.json({ error: 'No tenant access' }, { status: 403 });
    }

    // Get all users for this tenant via user_tenants
    const staffMembers = await prisma.user_tenants.findMany({
      where: {
        tenant_id: access.tenantId
      },
      include: {
        users: true
      },
      orderBy: [
        { role: 'asc' }, // owners first, then managers, then staff
        { created_at: 'asc' }
      ]
    });

    const formattedStaff = staffMembers.map(member => ({
      id: member.users.id,
      name: member.users.name,
      email: member.users.email,
      role: member.role || 'staff',
      joinedAt: member.created_at?.toISOString() || new Date().toISOString()
    }));

    return NextResponse.json(formattedStaff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}
