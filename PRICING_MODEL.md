# Pricing Model - AI Phone Ordering System

## Pricing Philosophy

**Transparent, Fair, Usage-Based**
- One-time registration fee covers infrastructure setup
- Twilio costs passed through at exact cost (no markup)
- OpenAI AI usage charged at 50% markup for profit
- No hidden fees, no surprises

---

## Fee Structure

### 1. Registration Fee (One-Time)

**$99 one-time payment** when restaurant signs up

**What it covers**:
- Server resource allocation on Railway
- Database provisioning on Supabase
- Clerk authentication user slots
- Twilio phone number setup & configuration
- Initial AI assistant training with restaurant menu
- Onboarding & support

**Breakdown**:
```
Your costs (first year):
- Railway allocation: $5/month × 12 = $60
- Supabase allocation: $2/month × 12 = $24
- Clerk user slots: $1/month × 12 = $12
- Setup labor & support: $20
Total cost: $116

Registration fee: $99
Net: -$17 first year (loss leader)

Year 2+: Pure profit from AI markup covers this
```

**Justification**:
- Industry standard for SaaS onboarding ($50-200)
- Filters out non-serious restaurants
- Covers your time for setup and training

---

### 2. Twilio Costs (Pass-Through, No Markup)

Charged monthly from prepaid wallet at **exact Twilio pricing**:

| Service | Twilio Cost | You Charge | Your Markup |
|---------|-------------|------------|-------------|
| Phone Number | $1.15/month | $1.15/month | $0 (pass-through) |
| Inbound Voice | $0.013/min | $0.013/min | $0 (pass-through) |
| Outbound Voice (SIP) | $0.013/min | $0.013/min | $0 (pass-through) |

**Example 5-minute call**:
- Inbound: 5 min × $0.013 = $0.065
- Outbound: 5 min × $0.013 = $0.065
- **Total Twilio cost**: $0.13
- **You charge**: $0.13 (exact pass-through)
- **Your profit from Twilio**: $0

**Why no markup?**
- Builds trust with transparent pricing
- Twilio costs are predictable and low
- Your profit comes from AI usage (where you add value)

---

### 3. OpenAI API Costs (50% Markup)

**Your revenue source**: AI token usage markup

| Service | OpenAI Cost | You Charge | Your Markup |
|---------|-------------|------------|-------------|
| AI Token Usage | Variable | Cost × 1.5 | **50% profit** |

**Example Call Costs**:

**Short call (2 minutes, simple order)**:
- OpenAI cost: $0.05
- Twilio cost: $0.052 (2 min × 2 × $0.013)
- **You charge**: $0.075 (AI) + $0.052 (Twilio) = **$0.127**
- **Your profit**: $0.025 (from AI markup)

**Medium call (5 minutes, complex order)**:
- OpenAI cost: $0.12
- Twilio cost: $0.13 (5 min × 2 × $0.013)
- **You charge**: $0.18 (AI) + $0.13 (Twilio) = **$0.31**
- **Your profit**: $0.06 (from AI markup)

**Long call (10 minutes, questions + order)**:
- OpenAI cost: $0.25
- Twilio cost: $0.26 (10 min × 2 × $0.013)
- **You charge**: $0.375 (AI) + $0.26 (Twilio) = **$0.635**
- **Your profit**: $0.125 (from AI markup)

---

## Cost Breakdown Per Call

### Detailed Cost Calculation

**OpenAI gpt-4-realtime Token Costs**:
```
Typical 5-minute call breakdown:

INPUT TOKENS:
- Cached text (menu): 15,000 tokens × $0.40/1M = $0.006
- Uncached audio (customer): 20,000 tokens × $32/1M = $0.640

OUTPUT TOKENS:
- Text responses: 2,000 tokens × $16/1M = $0.032
- Audio responses: 25,000 tokens × $64/1M = $1.600

TOTAL OPENAI COST: ~$2.278 (worst case)
With prompt caching & optimization: ~$0.08 - $0.15 typical
```

**Twilio Voice Costs**:
```
5-minute call:
- Inbound: 5 min × $0.013/min = $0.065
- Outbound (to OpenAI SIP): 5 min × $0.013/min = $0.065
TOTAL TWILIO COST: $0.13
```

**Total Customer Charge** (5-min call):
```
OpenAI: $0.12 × 1.5 = $0.18
Twilio: $0.13 × 1.0 = $0.13
TOTAL: $0.31 per call
```

**Your Profit** (5-min call):
```
Revenue: $0.31
Costs: $0.25 (OpenAI + Twilio)
PROFIT: $0.06 per call (~24% margin)
```

---

## Monthly Billing Examples

### Example 1: Small Restaurant (50 calls/month)

**Monthly Costs**:
```
Twilio phone number: $1.15
Call costs:
- 50 calls × 5 min avg × $0.31/call = $15.50

Total deducted from wallet: $16.65/month
Your profit: 50 × $0.06 = $3.00/month
```

### Example 2: Medium Restaurant (200 calls/month)

**Monthly Costs**:
```
Twilio phone number: $1.15
Call costs:
- 200 calls × 5 min avg × $0.31/call = $62.00

Total deducted from wallet: $63.15/month
Your profit: 200 × $0.06 = $12.00/month
```

### Example 3: Busy Restaurant (500 calls/month)

**Monthly Costs**:
```
Twilio phone number: $1.15
Call costs:
- 500 calls × 5 min avg × $0.31/call = $155.00

Total deducted from wallet: $156.15/month
Your profit: 500 × $0.06 = $30.00/month
```

---

## Revenue Projections

### Scenario: 100 Restaurants

**Tier Distribution** (by call volume):
- 40 restaurants: 50 calls/month (small)
- 40 restaurants: 200 calls/month (medium)
- 20 restaurants: 500 calls/month (busy)

**Monthly Revenue**:
```
Registration fees (one-time):
- New signups: ~10/month × $99 = $990 (first year only)

AI Markup Profit:
- Small: 40 × $3 = $120
- Medium: 40 × $12 = $480
- Busy: 20 × $30 = $600
Total AI profit: $1,200/month

TOTAL MONTHLY REVENUE: $1,200 + $990 (if acquiring) = $2,190
After first year: $1,200/month steady state
```

**Monthly Costs**:
```
Infrastructure (for 100 restaurants):
- Railway: $50 (scales with usage)
- Supabase: $25
- Clerk: $25
Total fixed: $100/month

Twilio & OpenAI: Pass-through (covered by customer wallet)

TOTAL COSTS: $100/month
```

**Monthly Profit**:
```
Revenue: $1,200
Costs: $100
PROFIT: $1,100/month (~92% margin on recurring) ✅
ANNUAL PROFIT: ~$13,200
```

---

## Database Schema

### Wallet Transactions Table (Updated)

```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(50) NOT NULL,
    -- 'registration_fee', 'recharge', 'ai_call_cost', 'twilio_call_cost', 'twilio_phone_number', 'refund'
  description TEXT,

  -- Cost breakdown
  openai_cost DECIMAL(10,6), -- Actual OpenAI cost
  openai_charged DECIMAL(10,6), -- What customer pays (cost × 1.5)
  twilio_cost DECIMAL(10,6), -- Actual Twilio cost (pass-through)
  platform_markup DECIMAL(10,6), -- Your profit (openai_charged - openai_cost)

  -- References
  stripe_payment_intent_id VARCHAR(255),
  related_call_log_id UUID REFERENCES call_logs(id),

  -- Balance tracking
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tenants Table (Add Registration Tracking)

```sql
ALTER TABLE tenants ADD COLUMN registration_fee_paid BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN registration_fee_amount DECIMAL(10,2) DEFAULT 99.00;
ALTER TABLE tenants ADD COLUMN registration_paid_at TIMESTAMP;
```

---

## Billing Logic Implementation

### 1. Registration Fee Collection

```typescript
// POST /api/registration/payment
export async function POST(request: Request) {
  const { userId } = await auth();
  const { tenantId } = await request.json();

  // Check if already paid
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { registration_fee_paid: true }
  });

  if (tenant.registration_fee_paid) {
    return NextResponse.json({ error: 'Registration fee already paid' }, { status: 400 });
  }

  // Create Stripe checkout for $99
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'AI Phone Ordering - Registration Fee',
          description: 'One-time setup and infrastructure allocation',
        },
        unit_amount: 9900, // $99.00
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_URL}/restaurants?registration=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/restaurants?registration=cancelled`,
    metadata: {
      tenant_id: tenantId,
      payment_type: 'registration_fee'
    }
  });

  return NextResponse.json({ sessionUrl: session.url });
}

// Stripe webhook handler
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;

  if (session.metadata.payment_type === 'registration_fee') {
    await prisma.tenants.update({
      where: { id: session.metadata.tenant_id },
      data: {
        registration_fee_paid: true,
        registration_paid_at: new Date(),
        status: 'active' // Activate restaurant
      }
    });
  }
}
```

### 2. Call Cost Deduction (Updated)

```typescript
// In openai-webhook route, after call ends
async function chargeForCall(callId: string, tenantId: string, callStats: any) {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { wallet_balance: true }
  });

  // Calculate costs
  const openaiCost = callStats.totalCost; // From call_logs.cost
  const callDurationMinutes = callStats.durationSeconds / 60;
  const twilioCost = callDurationMinutes * 0.013 * 2; // Inbound + outbound

  // Apply markup to OpenAI only
  const openaiCharged = openaiCost * 1.5; // 50% markup
  const twilioCharged = twilioCost; // Pass-through, no markup

  const totalCharge = openaiCharged + twilioCharged;
  const platformMarkup = openaiCharged - openaiCost; // Your profit

  const newBalance = tenant.wallet_balance - totalCharge;

  await prisma.$transaction([
    // Update tenant balance
    prisma.tenants.update({
      where: { id: tenantId },
      data: { wallet_balance: newBalance }
    }),

    // Record AI cost transaction
    prisma.wallet_transactions.create({
      data: {
        tenant_id: tenantId,
        amount: -openaiCharged,
        type: 'ai_call_cost',
        description: `AI cost for call ${callId}`,
        related_call_log_id: callId,
        openai_cost: openaiCost,
        openai_charged: openaiCharged,
        platform_markup: platformMarkup,
        balance_before: tenant.wallet_balance,
        balance_after: tenant.wallet_balance - openaiCharged
      }
    }),

    // Record Twilio cost transaction (separate line item for transparency)
    prisma.wallet_transactions.create({
      data: {
        tenant_id: tenantId,
        amount: -twilioCharged,
        type: 'twilio_call_cost',
        description: `Twilio voice cost for call ${callId} (${callDurationMinutes.toFixed(2)} min)`,
        related_call_log_id: callId,
        twilio_cost: twilioCost,
        platform_markup: 0, // No markup on Twilio
        balance_before: tenant.wallet_balance - openaiCharged,
        balance_after: newBalance
      }
    })
  ]);

  console.log(`💰 Call charged: AI $${openaiCharged.toFixed(4)} + Twilio $${twilioCharged.toFixed(4)} = $${totalCharge.toFixed(4)}`);
  console.log(`💵 Platform profit: $${platformMarkup.toFixed(4)}`);
}
```

### 3. Monthly Twilio Phone Number Fee

```typescript
// Cron job: Run on 1st of each month
async function chargeTwilioPhoneNumbers() {
  const tenants = await prisma.tenants.findMany({
    where: {
      status: 'active',
      registration_fee_paid: true
    }
  });

  for (const tenant of tenants) {
    const phoneNumberFee = 1.15;
    const newBalance = tenant.wallet_balance - phoneNumberFee;

    await prisma.$transaction([
      prisma.tenants.update({
        where: { id: tenant.id },
        data: { wallet_balance: newBalance }
      }),

      prisma.wallet_transactions.create({
        data: {
          tenant_id: tenant.id,
          amount: -phoneNumberFee,
          type: 'twilio_phone_number',
          description: 'Monthly Twilio phone number fee',
          twilio_cost: phoneNumberFee,
          platform_markup: 0,
          balance_before: tenant.wallet_balance,
          balance_after: newBalance
        }
      })
    ]);

    console.log(`📞 Charged ${tenant.name} monthly phone number fee: $${phoneNumberFee}`);
  }
}
```

---

## Customer-Facing Pricing Page

### Website Pricing Section

```markdown
# Pricing - AI Phone Ordering

## Simple, Transparent Pricing

### One-Time Registration
**$99** - Covers setup, infrastructure, and onboarding

### Usage-Based Billing
**Pay only for what you use**

- **AI Call Processing**: ~$0.15-0.30 per call*
  - *Varies by call length and complexity*
- **Phone Service**: $1.15/month + $0.013/minute (exact Twilio cost, no markup)

### Example Monthly Costs

| Call Volume | Estimated Monthly Cost |
|-------------|------------------------|
| 50 calls/month | ~$17 |
| 200 calls/month | ~$63 |
| 500 calls/month | ~$156 |

*Based on 5-minute average call length*

### What's Included
✅ AI phone agent trained on your menu
✅ Automatic order taking 24/7
✅ Order management dashboard
✅ Staff management & roles
✅ Real-time order notifications
✅ Call analytics & cost tracking
✅ No contracts, cancel anytime

### Prepaid Wallet System
Add credits to your wallet anytime. We'll notify you when balance is low.
```

---

## Competitive Analysis

### vs. Traditional Phone Systems

| Feature | Your Platform | Traditional Phone Order Taker |
|---------|---------------|-------------------------------|
| Setup Cost | $99 one-time | $0 (just a phone) |
| Monthly Cost | ~$17-156 (usage) | $2,000+ (staff wages) |
| Availability | 24/7 | Business hours only |
| Accuracy | 99%+ (AI) | 85-90% (human error) |
| Scalability | Unlimited concurrent calls | 1 call at a time per person |
| Annual Cost (200 calls/month) | ~$756 | ~$24,000 |

**ROI**: Customer saves $23,244/year vs. hiring staff

---

## Recommendations

1. **Registration Fee**: Set at $99 (industry standard, filters serious customers)
2. **AI Markup**: 50% is fair and sustainable (covers your value-add)
3. **Twilio Pass-Through**: Builds trust, simple to explain
4. **Transparency**: Show cost breakdown in dashboard (OpenAI cost, Twilio cost, your markup)
5. **Free Trial**: Offer $10 credit after registration to test the service

**Expected Customer Lifetime Value** (2 years):
```
Registration: $99
Monthly usage (avg 150 calls): $50/month × 24 = $1,200
Total: $1,299
Your profit: ~$99 (registration) + $300 (AI markup over 2 years) = ~$399
```

**Target**: Acquire 100 restaurants in Year 1 = $39,900 profit
