# Billing System Architecture

## Overview

This is a **prepaid wallet system** where restaurant owners pay for AI phone call services on a usage-based model. Customers pay for food orders locally (cash/card at pickup), not through the platform.

## Business Model

- **Revenue Source**: Restaurant owners pay for AI phone service
- **Billing Method**: Prepaid wallet credits
- **Charging Model**: Per AI call (usage-based)
- **Payment Processor**: Stripe Checkout
- **Customer Payments**: Handled locally by restaurants (not through platform)

---

## Database Schema

### Tenants Table (Add Columns)
```sql
ALTER TABLE tenants ADD COLUMN wallet_balance DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE tenants ADD COLUMN low_balance_threshold DECIMAL(10,2) DEFAULT 10.00;
ALTER TABLE tenants ADD COLUMN auto_recharge_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN auto_recharge_amount DECIMAL(10,2) DEFAULT 50.00;
ALTER TABLE tenants ADD COLUMN stripe_customer_id VARCHAR(255);
```

### Wallet Transactions Table
```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL, -- positive for credits, negative for charges
  type VARCHAR(50) NOT NULL, -- 'recharge', 'ai_call_cost', 'refund', 'adjustment'
  description TEXT,
  stripe_payment_intent_id VARCHAR(255),
  related_call_log_id UUID REFERENCES call_logs(id),
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id) -- who initiated the transaction
);

CREATE INDEX idx_wallet_transactions_tenant ON wallet_transactions(tenant_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
```

### Recharge History Table
```sql
CREATE TABLE recharge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id VARCHAR(255) NOT NULL,
  stripe_session_id VARCHAR(255),
  status VARCHAR(50) NOT NULL, -- 'pending', 'succeeded', 'failed', 'refunded'
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_recharge_tenant ON recharge_history(tenant_id);
```

---

## Workflow

### 1. AI Call Cost Deduction

**When**: After each AI phone call completes
**Where**: `app/api/openai-webhook/route.ts` (WebSocket close handler)
**Amount**: Calculated from `call_logs.cost` field

```typescript
async function chargeForCall(callId: string, tenantId: string, cost: number) {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { wallet_balance: true, low_balance_threshold: true }
  });

  // Calculate new balance
  const newBalance = tenant.wallet_balance - cost;

  // Deduct from wallet (atomic transaction)
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
        amount: -cost,
        type: 'ai_call_cost',
        description: `AI call cost for call ${callId}`,
        related_call_log_id: callId,
        balance_before: tenant.wallet_balance,
        balance_after: newBalance
      }
    })
  ]);

  console.log(`💰 Charged $${cost.toFixed(6)} for call ${callId}. New balance: $${newBalance.toFixed(2)}`);

  // Check if balance is low
  if (newBalance < tenant.low_balance_threshold) {
    await sendLowBalanceAlert(tenantId, newBalance);
  }

  // Check if balance is negative (overdraft)
  if (newBalance < 0) {
    await sendNegativeBalanceAlert(tenantId, newBalance);
    // Optionally: disable incoming calls until recharged
  }
}
```

**Integration Point**:
In `app/api/openai-webhook/route.ts`, after saving call log:

```typescript
ws.on('close', async () => {
  // ... existing code to save call log ...

  // Charge for the call
  await chargeForCall(call_id, tenant.id, totalCost);
});
```

---

### 2. Wallet Recharge (Stripe Checkout)

**Who**: Restaurant owners only
**Where**: Settings page → Wallet section
**Method**: Stripe Checkout Session

#### API Endpoint: Create Checkout Session
`POST /api/wallet/recharge`

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getActiveTenantId } from '@/lib/tenant-access';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

    const { amount } = await request.json(); // e.g., 50.00

    // Validate amount
    if (!amount || amount < 10 || amount > 1000) {
      return NextResponse.json({ error: 'Amount must be between $10 and $1000' }, { status: 400 });
    }

    const tenant = await prisma.tenants.findUnique({
      where: { id: access.tenantId },
      select: { name: true, stripe_customer_id: true }
    });

    // Create or retrieve Stripe customer
    let customerId = tenant.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { tenant_id: access.tenantId }
      });
      customerId = customer.id;

      await prisma.tenants.update({
        where: { id: access.tenantId },
        data: { stripe_customer_id: customerId }
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'AI Phone Service Credits',
            description: `Add $${amount.toFixed(2)} to wallet for ${tenant.name}`,
          },
          unit_amount: Math.round(amount * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_URL}/settings?recharge=success&amount=${amount}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/settings?recharge=cancelled`,
      metadata: {
        tenant_id: access.tenantId,
        recharge_amount: amount.toString(),
        user_id: userId
      }
    });

    // Record pending recharge
    await prisma.recharge_history.create({
      data: {
        tenant_id: access.tenantId,
        amount: amount,
        stripe_session_id: session.id,
        stripe_payment_intent_id: '', // Will be updated by webhook
        status: 'pending'
      }
    });

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error: any) {
    console.error('Error creating recharge session:', error);
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 });
  }
}
```

---

### 3. Stripe Webhook Handler

**Purpose**: Credit wallet when payment succeeds
**Endpoint**: `POST /api/webhooks/stripe`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature')!;

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
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

      const newBalance = tenant.wallet_balance + amount;

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
            balance_before: tenant.wallet_balance,
            balance_after: newBalance
          }
        }),

        // Update recharge history
        prisma.recharge_history.updateMany({
          where: { stripe_session_id: session.id },
          data: {
            status: 'succeeded',
            stripe_payment_intent_id: paymentIntentId,
            completed_at: new Date()
          }
        })
      ]);

      console.log(`✅ Wallet recharged for tenant ${tenantId}: +$${amount}. New balance: $${newBalance.toFixed(2)}`);
    }

    // Handle failed payment
    if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;

      await prisma.recharge_history.updateMany({
        where: { stripe_session_id: session.id },
        data: {
          status: 'failed',
          failure_reason: 'Payment failed or session expired',
          completed_at: new Date()
        }
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ Stripe webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

**Webhook Setup**:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`
4. Copy webhook signing secret to `.env` as `STRIPE_WEBHOOK_SECRET`

---

### 4. Get Wallet Balance & Transactions

#### Get Current Balance
`GET /api/wallet/balance`

```typescript
export async function GET(request: Request) {
  const { userId } = await auth();
  const activeRestaurantId = request.headers.get('x-active-restaurant-id');
  const access = await getActiveTenantId(userId, activeRestaurantId);

  if (!access) {
    return NextResponse.json({ error: 'No access' }, { status: 403 });
  }

  const tenant = await prisma.tenants.findUnique({
    where: { id: access.tenantId },
    select: {
      wallet_balance: true,
      low_balance_threshold: true,
      auto_recharge_enabled: true,
      auto_recharge_amount: true
    }
  });

  return NextResponse.json(tenant);
}
```

#### Get Transaction History
`GET /api/wallet/transactions`

```typescript
export async function GET(request: Request) {
  const { userId } = await auth();
  const activeRestaurantId = request.headers.get('x-active-restaurant-id');
  const access = await getActiveTenantId(userId, activeRestaurantId);

  if (!access) {
    return NextResponse.json({ error: 'No access' }, { status: 403 });
  }

  const transactions = await prisma.wallet_transactions.findMany({
    where: { tenant_id: access.tenantId },
    orderBy: { created_at: 'desc' },
    take: 100 // Last 100 transactions
  });

  return NextResponse.json(transactions);
}
```

---

## Frontend Implementation

### Settings Page - Wallet Section

```tsx
'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';

export default function WalletSection() {
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  async function loadWalletData() {
    const balanceRes = await apiFetch('/api/wallet/balance');
    const balanceData = await balanceRes.json();
    setWalletBalance(balanceData.wallet_balance);

    const txRes = await apiFetch('/api/wallet/transactions');
    const txData = await txRes.json();
    setTransactions(txData);
  }

  async function rechargeWallet(amount: number) {
    setLoading(true);
    try {
      const res = await apiFetch('/api/wallet/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      const { sessionUrl } = await res.json();
      window.location.href = sessionUrl; // Redirect to Stripe Checkout
    } catch (error) {
      console.error('Recharge failed:', error);
      alert('Failed to initiate recharge');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4" style={{ color: '#F2E4D6' }}>
        Wallet Balance
      </h2>

      {/* Balance Display */}
      <div className="mb-6">
        <div className="text-5xl font-bold mb-2" style={{ color: '#FFB975' }}>
          ${walletBalance.toFixed(2)}
        </div>
        <p className="text-sm" style={{ color: '#F2E4D6', opacity: 0.8 }}>
          Available credits
        </p>
      </div>

      {/* Low Balance Warning */}
      {walletBalance < 10 && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
          <p className="text-yellow-700 font-bold">⚠️ Low Balance!</p>
          <p className="text-yellow-600">Recharge your wallet to continue receiving AI phone calls.</p>
        </div>
      )}

      {/* Negative Balance Alert */}
      {walletBalance < 0 && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700 font-bold">❌ Negative Balance!</p>
          <p className="text-red-600">Please recharge immediately. Calls may be disabled.</p>
        </div>
      )}

      {/* Recharge Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => rechargeWallet(25)}
          disabled={loading}
          className="px-6 py-3 rounded-lg font-bold transition-all"
          style={{ backgroundColor: '#4C7A62', color: '#F2E4D6' }}
        >
          Add $25
        </button>
        <button
          onClick={() => rechargeWallet(50)}
          disabled={loading}
          className="px-6 py-3 rounded-lg font-bold transition-all"
          style={{ backgroundColor: '#4C7A62', color: '#F2E4D6' }}
        >
          Add $50
        </button>
        <button
          onClick={() => rechargeWallet(100)}
          disabled={loading}
          className="px-6 py-3 rounded-lg font-bold transition-all"
          style={{ backgroundColor: '#FFB975', color: '#174D5A' }}
        >
          Add $100
        </button>
      </div>

      {/* Transaction History */}
      <div>
        <h3 className="text-xl font-bold mb-3" style={{ color: '#F2E4D6' }}>
          Recent Transactions
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {transactions.map((tx: any) => (
            <div
              key={tx.id}
              className="flex justify-between items-center p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(242, 228, 214, 0.1)' }}
            >
              <div>
                <p className="font-semibold" style={{ color: '#F2E4D6' }}>
                  {tx.type === 'recharge' && '💳 Wallet Recharge'}
                  {tx.type === 'ai_call_cost' && '📞 AI Call Cost'}
                  {tx.type === 'refund' && '↩️ Refund'}
                </p>
                <p className="text-xs" style={{ color: '#F2E4D6', opacity: 0.6 }}>
                  {new Date(tx.created_at).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-xl font-bold"
                  style={{ color: tx.amount > 0 ? '#4C7A62' : '#FFB975' }}
                >
                  {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                </p>
                <p className="text-xs" style={{ color: '#F2E4D6', opacity: 0.6 }}>
                  Balance: ${tx.balance_after.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Alerts & Notifications

### Low Balance Alert
Trigger: When wallet balance drops below `low_balance_threshold` (default: $10)

```typescript
async function sendLowBalanceAlert(tenantId: string, currentBalance: number) {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    include: {
      user_tenants: {
        where: { role: 'owner' },
        include: { users: true }
      }
    }
  });

  // Send email to all owners
  for (const userTenant of tenant.user_tenants) {
    await sendEmail({
      to: userTenant.users.email,
      subject: `⚠️ Low Wallet Balance - ${tenant.name}`,
      body: `
        Your wallet balance is running low: $${currentBalance.toFixed(2)}

        Please recharge your wallet to continue receiving AI phone calls.

        Recharge now: ${process.env.NEXT_PUBLIC_URL}/settings
      `
    });
  }
}
```

### Negative Balance Alert
Trigger: When wallet balance goes negative (overdraft)

```typescript
async function sendNegativeBalanceAlert(tenantId: string, currentBalance: number) {
  // Similar to above, but with urgent message
  // Optionally: disable incoming calls until recharged

  await prisma.tenants.update({
    where: { id: tenantId },
    data: { is_open: false } // Temporarily close to prevent more charges
  });
}
```

---

## Pricing Model Suggestions

### Option 1: Per-Call Pricing
- **Base Rate**: $0.10 per call
- **Plus**: Actual OpenAI API cost (pass-through)
- **Example**: Call costs $0.05 in API → Customer pays $0.15 total

### Option 2: Bundled Pricing
- **Starter**: $25/month → 100 calls included, $0.20 per extra call
- **Professional**: $50/month → 300 calls included, $0.15 per extra call
- **Enterprise**: $100/month → 1000 calls included, $0.10 per extra call

### Option 3: Pure Usage (Current)
- Charge exact OpenAI cost + markup %
- **Markup**: 50-100% (e.g., if call costs $0.10, charge $0.15-$0.20)

---

## Edge Cases & Considerations

### 1. Negative Balance Handling
**Question**: What happens if a call costs more than current balance?

**Options**:
- **Allow overdraft** (negative balance): Customer can go negative, but gets alert
- **Block calls**: If balance < $5, don't accept new calls
- **Grace period**: Allow up to -$10, then block

**Recommendation**: Allow small overdraft (-$10 max) with urgent alert.

### 2. Refunds
If customer disputes a charge or call quality was poor:

```typescript
async function issueRefund(transactionId: string, reason: string) {
  const tx = await prisma.wallet_transactions.findUnique({
    where: { id: transactionId },
    include: { tenants: true }
  });

  const newBalance = tx.tenants.wallet_balance + Math.abs(tx.amount);

  await prisma.$transaction([
    prisma.tenants.update({
      where: { id: tx.tenant_id },
      data: { wallet_balance: newBalance }
    }),

    prisma.wallet_transactions.create({
      data: {
        tenant_id: tx.tenant_id,
        amount: Math.abs(tx.amount),
        type: 'refund',
        description: `Refund for transaction ${transactionId}: ${reason}`,
        balance_before: tx.tenants.wallet_balance,
        balance_after: newBalance
      }
    })
  ]);
}
```

### 3. Auto-Recharge
Restaurant can enable auto-recharge when balance drops below threshold:

```typescript
// Check after each call deduction
if (newBalance < tenant.low_balance_threshold && tenant.auto_recharge_enabled) {
  await triggerAutoRecharge(tenant.id, tenant.auto_recharge_amount);
}

async function triggerAutoRecharge(tenantId: string, amount: number) {
  // Use saved payment method to automatically charge
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { stripe_customer_id: true }
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100,
    currency: 'usd',
    customer: tenant.stripe_customer_id,
    payment_method: '...', // Saved payment method
    off_session: true,
    confirm: true,
    metadata: { tenant_id: tenantId }
  });

  // Webhook will handle crediting the wallet
}
```

---

## Security Considerations

1. **Webhook Verification**: Always verify Stripe webhook signatures
2. **Atomic Transactions**: Use Prisma transactions to prevent race conditions
3. **Owner-Only Recharge**: Only restaurant owners can add credits
4. **Amount Limits**: Set min ($10) and max ($1000) recharge amounts
5. **Idempotency**: Handle duplicate webhook deliveries gracefully

---

## Testing Checklist

- [ ] Recharge $50 → Balance increases by $50
- [ ] Make AI call → Balance decreases by call cost
- [ ] Low balance alert triggers at $10
- [ ] Negative balance alert triggers at $0
- [ ] Stripe webhook processes payment correctly
- [ ] Failed payment updates status to 'failed'
- [ ] Transaction history displays correctly
- [ ] Only owners can recharge wallet
- [ ] Staff/managers can view balance but not recharge

---

## Environment Variables Required

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App URL
NEXT_PUBLIC_URL=https://yourdomain.com
```

---

## Future Enhancements

1. **Subscription Plans**: Monthly subscription with included credits
2. **Volume Discounts**: Lower per-call cost for high-volume customers
3. **Invoice Generation**: Monthly invoices for accounting
4. **Multiple Payment Methods**: Bank transfer, PayPal, crypto
5. **Usage Analytics**: Dashboard showing cost trends over time
6. **Budget Alerts**: Alert when spending exceeds X per month
7. **Team Billing**: Multiple restaurants under one billing account
