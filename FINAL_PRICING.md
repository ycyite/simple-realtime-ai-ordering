# Final Pricing Model

## Revenue Structure

### 1. Monthly Subscription Fee
**$10/month per restaurant**

**What it covers (your operational costs)**:
- Railway server hosting
- Supabase database
- Clerk authentication
- Platform maintenance & updates
- Customer support

**Your costs per restaurant** (with 100 restaurants sharing infrastructure):
```
Total monthly infrastructure: $100
÷ 100 restaurants = $1/restaurant
Your subscription fee: $10/month
Your profit: $9/month per restaurant ✅
```

---

### 2. Usage-Based Fees (Deducted from Wallet)

#### A. OpenAI API (50% Markup - Your Profit)
- **Actual OpenAI cost**: Variable per call (~$0.08-0.20)
- **You charge**: Cost × 1.5
- **Example**: If call costs $0.12 → You charge $0.18
- **Your profit**: $0.06 per call

#### B. Twilio Costs (Pass-Through - No Markup)
- **Phone number**: $1.15/month (exact Twilio cost)
- **Voice minutes**: $0.013/min × 2 directions (exact Twilio cost)
- **Your markup**: $0 (transparent pass-through)

---

## Customer Pricing Summary

### What Restaurants Pay

**Monthly Fixed**: $10 subscription fee

**Per Call** (~5 min average):
- AI processing: ~$0.18
- Phone minutes: ~$0.13 (5 min × 2 × $0.013)
- **Total per call**: ~$0.31

**Monthly Total** (varies by usage):
- Base subscription: $10.00
- Phone number: $1.15
- 50 calls: $15.50
- **Total for 50 calls/month**: $26.65

---

## Revenue Projections

### Scenario: 100 Restaurants

**Monthly Recurring Revenue (MRR)**:
```
Subscription fees: 100 × $10 = $1,000/month
```

**Usage-Based Profit** (AI markup only):
```
Assume average 150 calls/restaurant/month:
- OpenAI profit: $0.06/call
- Total calls: 100 restaurants × 150 = 15,000 calls
- AI profit: 15,000 × $0.06 = $900/month
```

**Total Monthly Revenue**:
```
Subscriptions: $1,000
AI markup profit: $900
TOTAL: $1,900/month
```

**Monthly Costs**:
```
Infrastructure: $100 (Railway + Supabase + Clerk)
Twilio & OpenAI: Pass-through (customer pays via wallet)
TOTAL COSTS: $100/month
```

**Monthly Profit**:
```
Revenue: $1,900
Costs: $100
PROFIT: $1,800/month (~95% margin) ✅

Annual Profit: $21,600
```

---

## Database Schema

### Subscription Tracking

```sql
-- Add to tenants table
ALTER TABLE tenants ADD COLUMN subscription_fee DECIMAL(10,2) DEFAULT 10.00;
ALTER TABLE tenants ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'active'; -- 'active', 'cancelled', 'past_due'
ALTER TABLE tenants ADD COLUMN subscription_start_date DATE;
ALTER TABLE tenants ADD COLUMN next_billing_date DATE;

-- Subscription billing history
CREATE TABLE subscription_billings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  subscription_fee DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'paid', -- 'paid', 'pending', 'failed'
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Billing Logic

### 1. Monthly Subscription Charge

```typescript
// Cron job: Runs on each restaurant's billing date
async function chargeMonthlySubscriptions() {
  const today = new Date().toISOString().split('T')[0];

  const tenants = await prisma.tenants.findMany({
    where: {
      status: 'active',
      subscription_status: 'active',
      next_billing_date: today
    }
  });

  for (const tenant of tenants) {
    const subscriptionFee = tenant.subscription_fee; // $10
    const phoneNumberFee = 1.15; // Twilio monthly fee
    const totalMonthlyFee = subscriptionFee + phoneNumberFee;

    const newBalance = tenant.wallet_balance - totalMonthlyFee;

    // Check if sufficient balance
    if (newBalance < -10) { // Allow $10 overdraft
      await sendInsufficientBalanceAlert(tenant.id);
      await prisma.tenants.update({
        where: { id: tenant.id },
        data: { subscription_status: 'past_due' }
      });
      continue;
    }

    await prisma.$transaction([
      // Deduct subscription fee
      prisma.tenants.update({
        where: { id: tenant.id },
        data: {
          wallet_balance: newBalance,
          next_billing_date: new Date(new Date(tenant.next_billing_date).setMonth(new Date(tenant.next_billing_date).getMonth() + 1))
        }
      }),

      // Record subscription transaction
      prisma.wallet_transactions.create({
        data: {
          tenant_id: tenant.id,
          amount: -subscriptionFee,
          type: 'subscription_fee',
          description: `Monthly subscription fee`,
          balance_before: tenant.wallet_balance,
          balance_after: tenant.wallet_balance - subscriptionFee
        }
      }),

      // Record Twilio phone number fee
      prisma.wallet_transactions.create({
        data: {
          tenant_id: tenant.id,
          amount: -phoneNumberFee,
          type: 'twilio_phone_number',
          description: `Twilio phone number monthly fee`,
          twilio_cost: phoneNumberFee,
          platform_markup: 0,
          balance_before: tenant.wallet_balance - subscriptionFee,
          balance_after: newBalance
        }
      }),

      // Record in subscription billing history
      prisma.subscription_billings.create({
        data: {
          tenant_id: tenant.id,
          billing_period_start: tenant.next_billing_date,
          billing_period_end: new Date(new Date(tenant.next_billing_date).setMonth(new Date(tenant.next_billing_date).getMonth() + 1)),
          subscription_fee: subscriptionFee,
          status: 'paid'
        }
      })
    ]);

    console.log(`✅ Charged ${tenant.name} monthly subscription: $${totalMonthlyFee}`);
  }
}
```

### 2. Call Cost Deduction (Same as before)

```typescript
async function chargeForCall(callId: string, tenantId: string, callStats: any) {
  const openaiCost = callStats.totalCost;
  const twilioCallCost = (callStats.durationSeconds / 60) * 0.013 * 2;

  // 50% markup on OpenAI only
  const openaiCharged = openaiCost * 1.5;
  const twilioCharged = twilioCallCost; // Pass-through

  // Deduct from wallet...
  // (Same implementation as PRICING_MODEL.md)
}
```

---

## Customer-Facing Pricing

### Pricing Page

```markdown
# Pricing

## $10/month + Usage

### Monthly Subscription: $10
✅ AI phone ordering system
✅ Order management dashboard
✅ Staff management
✅ Analytics & reporting
✅ 24/7 support

### Usage Costs (Pay As You Go)
- **AI Calls**: ~$0.15-0.30 per call*
- **Phone Service**: $1.15/month + $0.013/minute

*Varies by call length. Average 5-min call = $0.31

### Example Monthly Bills

| Calls/Month | Subscription | Usage | Total |
|-------------|--------------|-------|-------|
| 0 calls | $10 | $1.15 | **$11.15** |
| 50 calls | $10 | $16.65 | **$26.65** |
| 150 calls | $10 | $47.65 | **$57.65** |
| 300 calls | $10 | $94.15 | **$104.15** |

### No Setup Fees. Cancel Anytime.
```

---

## Why This Model Works

### Benefits for You:
1. **Predictable MRR**: $10 × 100 restaurants = $1,000/month baseline
2. **Scalable profit**: More calls = more AI markup profit
3. **High margins**: 95%+ after covering infrastructure
4. **Sustainable**: Subscription covers fixed costs even if they don't use it much

### Benefits for Restaurants:
1. **Low entry barrier**: Only $10/month to start
2. **Pay for what you use**: No expensive plans with unused minutes
3. **Transparent pricing**: See exact OpenAI and Twilio costs
4. **No contracts**: Cancel anytime, no lock-in
5. **Better than hiring**: $27/month (50 calls) vs. $2,000/month for staff

---

## Comparison to Other Models

| Model | Monthly Base | Per Call | MRR (100 rest.) | Pros | Cons |
|-------|--------------|----------|-----------------|------|------|
| **$10 Sub + Usage** | $10 | $0.31 | $1,000 + usage | Predictable, fair | Requires wallet management |
| One-time $99 | $0 | $0.31 | $0 (after Year 1) | Easy to sell | No recurring revenue |
| $25-99 Tiers | $25-99 | Included | $2,500-9,900 | High MRR | High churn, price sensitivity |

**Winner**: **$10 Subscription + Usage** ✅
- Sweet spot between value and revenue
- Low churn (cheap enough to keep)
- High profit margins
- Room to upsell premium features later

---

## Implementation Checklist

- [ ] Add subscription fields to tenants table
- [ ] Create subscription_billings table
- [ ] Implement monthly billing cron job
- [ ] Update wallet transaction types
- [ ] Add subscription management UI in settings
- [ ] Create subscription checkout flow (Stripe)
- [ ] Send billing reminder emails 3 days before charge
- [ ] Handle failed payments (retry, suspend service)
- [ ] Add "Past Due" status and grace period logic

---

## Pricing Psychology Tips

1. **$10 feels cheap** - Most restaurants spend $10 on coffee in a day
2. **Usage-based is fair** - They only pay when they get value (orders)
3. **Show savings** - "Save $1,973/month vs. hiring staff"
4. **Free trial**: First month free (you still profit from AI markup)
5. **Annual discount**: $100/year (save $20) - improves retention
