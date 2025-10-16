import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getActiveTenantId } from '@/lib/tenant-access';

export const runtime = 'nodejs';

// Get all invite codes for the active restaurant
export async function GET(request: Request) {
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

    // Only owners and managers can view invite codes
    if (access.role !== 'owner' && access.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const inviteCodes = await prisma.invite_codes.findMany({
      where: {
        tenant_id: access.tenantId,
        is_used: false, // Only show unused codes
        OR: [
          { expires_at: null },
          { expires_at: { gt: new Date() } }
        ]
      },
      include: {
        created_by: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json(inviteCodes);
  } catch (error) {
    console.error('Error fetching invite codes:', error);
    return NextResponse.json({ error: 'Failed to fetch invite codes' }, { status: 500 });
  }
}

// Create a new invite code
export async function POST(request: Request) {
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

    // Only owners and managers can create invite codes
    if (access.role !== 'owner' && access.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { role, expiresInDays } = await request.json();

    // Validate role
    if (!['staff', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Managers can only create staff invites, not manager invites
    if (access.role === 'manager' && role === 'manager') {
      return NextResponse.json({ error: 'Managers cannot create manager invites' }, { status: 403 });
    }

    // Get current user ID
    const user = await prisma.users.findUnique({
      where: { clerk_user_id: userId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate unique code
    const code = generateInviteCode();

    // Calculate expiration
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const inviteCode = await prisma.invite_codes.create({
      data: {
        tenant_id: access.tenantId,
        code,
        role,
        created_by_user_id: user.id,
        expires_at: expiresAt
      },
      include: {
        created_by: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`✅ Created invite code ${code} for role ${role}`);

    return NextResponse.json(inviteCode);
  } catch (error) {
    console.error('Error creating invite code:', error);
    return NextResponse.json({ error: 'Failed to create invite code' }, { status: 500 });
  }
}

// Delete an invite code
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

    // Only owners and managers can delete invite codes
    if (access.role !== 'owner' && access.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { codeId } = await request.json();

    // Verify the code belongs to this tenant
    const inviteCode = await prisma.invite_codes.findFirst({
      where: {
        id: codeId,
        tenant_id: access.tenantId
      }
    });

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code not found' }, { status: 404 });
    }

    await prisma.invite_codes.delete({
      where: { id: codeId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invite code:', error);
    return NextResponse.json({ error: 'Failed to delete invite code' }, { status: 500 });
  }
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 9; i++) {
    if (i === 3 || i === 6) {
      code += '-';
    } else {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return code; // Format: ABC-DEF-123
}
