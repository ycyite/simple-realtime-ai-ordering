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

    // Check if user has a tenant
    const user = await prisma.users.findUnique({
      where: { clerk_user_id: userId },
      include: { tenants: true }
    });

    // If user has a tenant, onboarding is complete
    const completed = !!user?.tenant_id && !!user?.tenants;

    return NextResponse.json({
      completed,
      tenant: user?.tenants ? {
        name: user.tenants.name,
        phone_number: user.tenants.phone_number,
        address: user.tenants.address,
        role: user.role
      } : null
    });
  } catch (error) {
    console.error('Onboarding status check error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
