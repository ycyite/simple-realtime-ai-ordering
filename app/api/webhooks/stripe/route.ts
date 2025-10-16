import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    const body = await request.text();
    const sig = request.headers.get('stripe-signature')!;

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET not set');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const stripe = getStripe();

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log('🔔 Stripe webhook received:', event.type);

    // Handle successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const tenantId = session.metadata!.tenant_id;
      const amount = parseFloat(session.metadata!.recharge_amount);
      const paymentIntentId = session.payment_intent as string;

      // Get current balance
      const tenant = await prisma.tenants.findUnique({
        where: { id: tenantId },
        select: { wallet_balance: true }
      });

      if (!tenant) {
        console.error('❌ Tenant not found:', tenantId);
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
      }

      const currentBalance = Number(tenant.wallet_balance) || 0;
      const newBalance = currentBalance + amount;

      // Credit wallet (atomic transaction)
      await prisma.$transaction([
        // Update tenant balance
        prisma.tenants.update({
          where: { id: tenantId },
          data: { wallet_balance: newBalance }
        }),

        // Record transaction
        prisma.wallet_transactions.create({
          data: {
            tenant_id: tenantId,
            amount: amount,
            type: 'recharge',
            description: `Wallet recharge via Stripe`,
            stripe_payment_intent_id: paymentIntentId,
            balance_before: currentBalance,
            balance_after: newBalance
          }
        })
      ]);

      console.log(`✅ Wallet recharged for tenant ${tenantId}: +$${amount.toFixed(2)}. New balance: $${newBalance.toFixed(2)}`);
    }

    // Handle failed payment
    if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
      const session = event.data.object as any;
      console.log('❌ Payment failed or expired:', session.id);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ Stripe webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
