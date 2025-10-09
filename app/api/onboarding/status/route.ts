import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

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
      include: { tenants: true }
    });

    if (!user?.tenants) {
      return NextResponse.json({ completed: false });
    }

    // Check if tenant has meaningful data (not just auto-generated defaults)
    const tenant = user.tenants;
    const completed = tenant.settings &&
                     (tenant.settings as any).onboarding_completed === true;

    return NextResponse.json({
      completed,
      tenant: {
        name: tenant.name,
        phone_number: tenant.phone_number,
        address: tenant.address
      }
    });
  } catch (error) {
    console.error('Onboarding status check error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
