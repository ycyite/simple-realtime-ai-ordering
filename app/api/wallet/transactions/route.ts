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

    // Fetch last 100 transactions for this tenant
    const transactions = await prisma.wallet_transactions.findMany({
      where: { tenant_id: access.tenantId },
      orderBy: { created_at: 'desc' },
      take: 100
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error fetching wallet transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
