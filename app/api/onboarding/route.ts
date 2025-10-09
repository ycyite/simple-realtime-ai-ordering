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

    const { restaurantName, phoneNumber, address } = await request.json();

    if (!restaurantName) {
      return NextResponse.json({ error: 'Restaurant name is required' }, { status: 400 });
    }

    // Check if user already has a tenant
    const existingUser = await prisma.users.findUnique({
      where: { clerk_user_id: userId },
      include: { tenants: true }
    });

    if (existingUser?.tenants) {
      // Update existing tenant and mark onboarding as completed
      await prisma.tenants.update({
        where: { id: existingUser.tenant_id! },
        data: {
          name: restaurantName,
          phone_number: phoneNumber || null,
          address: address || null,
          settings: { onboarding_completed: true },
          updated_at: new Date()
        }
      });

      return NextResponse.json({ success: true, message: 'Restaurant updated' });
    }

    // If webhook hasn't created tenant yet, create it now
    const email = user.emailAddresses[0]?.emailAddress || '';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0];

    // Generate unique slug
    const baseSlug = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);

    let slug = baseSlug;
    let counter = 1;

    while (await prisma.tenants.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create tenant with onboarding completed flag
    const tenant = await prisma.tenants.create({
      data: {
        name: restaurantName,
        slug,
        phone_number: phoneNumber || null,
        address: address || null,
        wallet_balance: 10.00, // $10 starting credit
        status: 'active',
        is_open: true,
        settings: { onboarding_completed: true },
      },
    });

    // Create or update user
    if (existingUser) {
      await prisma.users.update({
        where: { id: existingUser.id },
        data: { tenant_id: tenant.id }
      });
    } else {
      await prisma.users.create({
        data: {
          tenant_id: tenant.id,
          clerk_user_id: userId,
          email,
          name,
          role: 'owner',
        },
      });
    }

    console.log(`✅ Onboarding completed for ${restaurantName}`);

    return NextResponse.json({ success: true, tenant });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
  }
}
