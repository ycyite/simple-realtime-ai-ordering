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

    // Get or create user
    let dbUser = await prisma.users.findUnique({
      where: { clerk_user_id: userId }
    });

    if (!dbUser) {
      // Create user if doesn't exist
      dbUser = await prisma.users.create({
        data: {
          clerk_user_id: userId,
          email,
          name,
        },
      });
    }

    // Check if user already belongs to this tenant
    const existingRelation = await prisma.user_tenants.findFirst({
      where: {
        user_id: dbUser.id,
        tenant_id: tenant.id
      }
    });

    if (existingRelation) {
      return NextResponse.json({ error: 'You already belong to this restaurant' }, { status: 400 });
    }

    // Create user_tenant relationship
    await prisma.user_tenants.create({
      data: {
        user_id: dbUser.id,
        tenant_id: tenant.id,
        role: 'staff' // Default role when joining
      }
    });

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
