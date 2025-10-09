import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inviteCode } = await request.json();

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    // Find tenant with this invite code
    const tenant = await prisma.tenants.findFirst({
      where: {
        settings: {
          path: ['invite_code'],
          equals: inviteCode
        }
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    const email = user.emailAddresses[0]?.emailAddress || '';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0];

    // Check if user already belongs to this tenant
    const existingUser = await prisma.users.findFirst({
      where: {
        clerk_user_id: userId,
        tenant_id: tenant.id
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'You already belong to this restaurant' }, { status: 400 });
    }

    // For old schema: update or create user
    // TODO: When migrating to user_tenants, create entry in junction table instead
    const dbUser = await prisma.users.findUnique({
      where: { clerk_user_id: userId }
    });

    if (dbUser) {
      // User exists but belongs to different tenant
      // For now, switch them (in new schema, we'd add to user_tenants)
      await prisma.users.update({
        where: { id: dbUser.id },
        data: {
          tenant_id: tenant.id,
          role: 'staff' // Default role when joining
        }
      });
    } else {
      // Create new user
      await prisma.users.create({
        data: {
          tenant_id: tenant.id,
          clerk_user_id: userId,
          email,
          name,
          role: 'staff',
        },
      });
    }

    console.log(`✅ User ${email} joined restaurant "${tenant.name}"`);

    return NextResponse.json({
      success: true,
      restaurant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        role: 'staff'
      }
    });
  } catch (error) {
    console.error('Join restaurant error:', error);
    return NextResponse.json({ error: 'Failed to join restaurant' }, { status: 500 });
  }
}
