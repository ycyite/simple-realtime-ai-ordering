import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getActiveTenantId } from '@/lib/tenant-access';
import Stripe from 'stripe';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover',
  });
}

export async function POST(request: Request) {
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

    // Only owners can recharge wallet
    if (access.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can recharge wallet' }, { status: 403 });
    }

    const { amount } = await request.json();

    // Validate amount
    if (!amount || amount < 15 || amount > 1000) {
      return NextResponse.json({ error: 'Amount must be between $15 and $1000' }, { status: 400 });
    }

    const stripe = getStripe();

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Wallet Credit',
            description: `Add $${amount.toFixed(2)} to your AI Phone Service wallet`,
            tax_code: 'txcd_10000000', // General digital product
          },
          unit_amount: Math.round(amount * 100), // Convert to cents
          tax_behavior: 'exclusive', // Tax added on top of amount
        },
        quantity: 1,
      }],
      mode: 'payment',
      automatic_tax: {
        enabled: true,
      },
      success_url: `${process.env.NEXT_PUBLIC_URL || 'https://counterbell.up.railway.app'}/billing?recharge=success&amount=${amount}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || 'https://counterbell.up.railway.app'}/billing?recharge=cancelled`,
      metadata: {
        tenant_id: access.tenantId,
        recharge_amount: amount.toString(),
        user_id: userId
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating recharge session:', error);
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 });
  }
}
