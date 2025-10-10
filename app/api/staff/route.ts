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

    const formattedStaff = staffMembers
      .filter(member => member.users !== null)
      .map(member => ({
        id: member.users!.id,
        name: member.users!.name,
        email: member.users!.email,
        role: member.role || 'staff',
        joinedAt: member.created_at?.toISOString() || new Date().toISOString()
      }));

    return NextResponse.json(formattedStaff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

// Remove a staff member from the restaurant
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeRestaurantId = request.headers.get('x-active-restaurant-id');
    const access = await getActiveTenantId(userId, activeRestaurantId);

    if (!access) {
      return NextResponse.json({ error: 'No tenant access' }, { status: 403 });
    }

    // Only owners and managers can remove staff
    if (access.role !== 'owner' && access.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { staffUserId } = await request.json();

    if (!staffUserId) {
      return NextResponse.json({ error: 'Staff user ID is required' }, { status: 400 });
    }

    // Get the user_tenant relationship to check permissions
    const targetRelation = await prisma.user_tenants.findFirst({
      where: {
        user_id: staffUserId,
        tenant_id: access.tenantId
      }
    });

    if (!targetRelation) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Prevent removing yourself
    const currentUser = await prisma.users.findUnique({
      where: { clerk_user_id: userId }
    });

    if (currentUser?.id === staffUserId) {
      return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 });
    }

    // Managers cannot remove owners or other managers
    if (access.role === 'manager' && (targetRelation.role === 'owner' || targetRelation.role === 'manager')) {
      return NextResponse.json({ error: 'Managers cannot remove owners or managers' }, { status: 403 });
    }

    // Check if removing the last owner
    if (targetRelation.role === 'owner') {
      const ownerCount = await prisma.user_tenants.count({
        where: {
          tenant_id: access.tenantId,
          role: 'owner'
        }
      });

      if (ownerCount <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last owner' }, { status: 400 });
      }
    }

    // Delete the user_tenant relationship
    await prisma.user_tenants.delete({
      where: {
        id: targetRelation.id
      }
    });

    console.log(`✅ Removed staff member ${staffUserId} from tenant ${access.tenantId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing staff:', error);
    return NextResponse.json({ error: 'Failed to remove staff' }, { status: 500 });
  }
}
