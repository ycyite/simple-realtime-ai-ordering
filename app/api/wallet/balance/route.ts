import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getActiveTenantId } from '@/lib/tenant-access';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeRestaurantId = request.headers.get('x-active-restaurant-id');
    const access = await getActiveTenantId(userId, activeRestaurantId);

    if (!access) {
      return NextResponse.json({ error: 'No access to restaurant' }, { status: 403 });
    }

    const tenant = await prisma.tenants.findUnique({
      where: { id: access.tenantId },
      select: {
        wallet_balance: true,
        low_balance_threshold: true,
        subscription_fee: true,
        subscription_status: true
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json({
      walletBalance: Number(tenant.wallet_balance) || 0,
      lowBalanceThreshold: Number(tenant.low_balance_threshold) || 10,
      subscriptionFee: Number(tenant.subscription_fee) || 10,
      subscriptionStatus: tenant.subscription_status || 'active'
    });
  } catch (error: any) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}
