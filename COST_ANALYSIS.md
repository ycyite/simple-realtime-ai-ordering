# Cost Analysis & Pricing Strategy

## Platform Operational Costs

### Variable Costs (Per Call)

| Service | Unit Cost | Calculation | Example (5-min call) |
|---------|-----------|-------------|----------------------|
| **OpenAI gpt-4-realtime** | Varies | Based on tokens + audio | $0.05 - $0.20 |
| **Twilio Voice (Inbound)** | $0.013/min | Minutes × rate | $0.065 (5 min) |
| **Twilio Voice (Outbound/SIP)** | $0.013/min | Minutes × rate | $0.065 (5 min) |
| **Total Per Call** | | | **~$0.18 - $0.33** |

#### OpenAI Cost Breakdown (gpt-4-realtime)
- **Cached Text Input**: $0.40 / 1M tokens (menu gets cached after 1st call)
- **Uncached Text Input**: $4.00 / 1M tokens
- **Cached Audio Input**: $0.40 / 1M tokens
- **Uncached Audio Input**: $32.00 / 1M tokens
- **Text Output**: $16.00 / 1M tokens
- **Audio Output**: $64.00 / 1M tokens

**Typical 5-min call**:
- Input: ~15k cached text (menu) + ~20k audio tokens = $0.008 + $0.008 = $0.016
- Output: ~2k text + ~25k audio = $0.032 + $1.60 = $1.632
- **Total**: ~$1.65 per 5-min call (worst case, likely $0.05-0.20 with optimization)

#### Twilio Cost Breakdown
- **Phone Number**: $1.15/month per number
- **Inbound Voice**: $0.013/min
- **Outbound Voice**: $0.013/min (to SIP/OpenAI)
- **SMS** (future): $0.0079/message

### Fixed Monthly Costs (Infrastructure)

| Service | Plan | Monthly Cost | Notes |
|---------|------|--------------|-------|
| **Railway** | Pro | $5 - $50 | Scales with usage, CPU/RAM hours |
| **Supabase** | Pro | $25 | Includes 8GB database, 50GB bandwidth |
| **Clerk** | Pro | $25 | Up to 10,000 MAU (Monthly Active Users) |
| **Domain** | - | $1 - $2 | .com domain + DNS |
| **Stripe** | Pay-as-you-go | 2.9% + $0.30 | Per transaction fee |
| **Total Fixed** | | **~$56 - $102/month** | Baseline infrastructure |

### Cost Per Restaurant (Amortized)

Assuming **100 active restaurants** sharing infrastructure:

| Cost Type | Total Monthly | Per Restaurant | Notes |
|-----------|---------------|----------------|-------|
| Infrastructure | $56 - $102 | $0.56 - $1.02 | Fixed costs divided |
| Twilio Phone # | $1.15 | $1.15 | Each restaurant has own number |
| **Base Cost** | | **~$1.70/month** | Before any calls |

---

## Pricing Models

### Model 1: Pure Usage-Based (High Risk, Low Barrier)

**Structure**: No base fee, only pay per call

| Component | Your Cost | Your Price | Margin |
|-----------|-----------|------------|--------|
| Per Call | $0.20 (avg) | $0.50 | 150% markup |

**Pros**:
- Low barrier to entry for restaurants
- Easy to understand
- Scales automatically

**Cons**:
- Fixed costs not covered if low usage
- Hard to predict revenue
- Requires high volume to be profitable

**Breakeven**: Need ~120 calls/month across all restaurants to cover $56 fixed costs

---

### Model 2: Base Fee + Usage (Recommended)

**Structure**: Monthly subscription + per-call charges

#### Tier 1: Starter
- **$29/month base fee**
- **$0.35/call**
- **25 calls included** (worth $8.75)
- Extra calls: $0.35 each

#### Tier 2: Professional
- **$59/month base fee**
- **$0.30/call**
- **100 calls included** (worth $30)
- Extra calls: $0.30 each

#### Tier 3: Enterprise
- **$99/month base fee**
- **$0.25/call**
- **500 calls included** (worth $125)
- Extra calls: $0.25 each

**Revenue Example** (100 restaurants, 50% on each tier):
- 33 × $29 = $967
- 33 × $59 = $1,947
- 34 × $99 = $3,366
- **Monthly Base Revenue**: $6,280
- **Plus**: Usage overage fees
- **Total**: ~$7,000 - $10,000/month

**Costs**:
- Fixed: $102
- Variable: ~$1,000 (assuming 5,000 calls × $0.20)
- **Total Cost**: ~$1,102
- **Profit**: ~$5,900 - $8,900/month ✅

---

### Model 3: All-Inclusive (Simple, Predictable)

**Structure**: Flat monthly fee, unlimited calls

| Tier | Price | Margin Strategy |
|------|-------|-----------------|
| **Starter** | $49/month | Up to 150 calls/month |
| **Professional** | $99/month | Up to 400 calls/month |
| **Enterprise** | $199/month | Up to 1,000 calls/month |

**Risk**: If customers exceed expected usage, you lose money.
**Mitigation**: Add "fair use policy" or soft limits

---

## Recommended Pricing: Hybrid Model

### Pricing Table

| Plan | Base Fee | Included Calls | Overage Rate | Best For |
|------|----------|----------------|--------------|----------|
| **Starter** | $25/month | 50 calls | $0.40/call | Small restaurants, 1-2 calls/day |
| **Growth** | $50/month | 150 calls | $0.35/call | Medium traffic, 5 calls/day |
| **Professional** | $99/month | 400 calls | $0.30/call | High volume, 10-15 calls/day |
| **Enterprise** | Custom | Custom | $0.25/call | Multi-location chains |

### Value Proposition per Tier

**Starter ($25/month)**:
- 50 calls included = $0.50/call effective rate
- Best for: New restaurants testing the service
- Breakeven: You profit if they use <125 calls

**Growth ($50/month)**:
- 150 calls included = $0.33/call effective rate
- Best for: Established restaurants with steady phone orders
- Breakeven: You profit if they use <250 calls

**Professional ($99/month)**:
- 400 calls included = $0.25/call effective rate
- Best for: Busy restaurants, multiple phone lines
- Breakeven: You profit if they use <495 calls

---

## Cost Tracking Implementation

### Enhanced Database Schema

```sql
-- Add pricing tier to tenants
ALTER TABLE tenants ADD COLUMN pricing_tier VARCHAR(50) DEFAULT 'starter'; -- 'starter', 'growth', 'professional', 'enterprise'
ALTER TABLE tenants ADD COLUMN monthly_subscription_fee DECIMAL(10,2) DEFAULT 25.00;
ALTER TABLE tenants ADD COLUMN included_calls_per_month INTEGER DEFAULT 50;
ALTER TABLE tenants ADD COLUMN overage_rate DECIMAL(10,4) DEFAULT 0.40;
ALTER TABLE tenants ADD COLUMN billing_cycle_start DATE;
ALTER TABLE tenants ADD COLUMN calls_used_this_cycle INTEGER DEFAULT 0;

-- Enhanced wallet transactions with cost breakdown
ALTER TABLE wallet_transactions ADD COLUMN openai_cost DECIMAL(10,6);
ALTER TABLE wallet_transactions ADD COLUMN twilio_cost DECIMAL(10,6);
ALTER TABLE wallet_transactions ADD COLUMN platform_fee DECIMAL(10,6);
ALTER TABLE wallet_transactions ADD COLUMN cost_breakdown JSONB; -- Detailed breakdown

-- Monthly billing summary
CREATE TABLE billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  cycle_start DATE NOT NULL,
  cycle_end DATE NOT NULL,
  subscription_fee DECIMAL(10,2) NOT NULL,
  included_calls INTEGER NOT NULL,
  total_calls INTEGER DEFAULT 0,
  overage_calls INTEGER DEFAULT 0,
  overage_charges DECIMAL(10,2) DEFAULT 0.00,
  total_openai_cost DECIMAL(10,2) DEFAULT 0.00,
  total_twilio_cost DECIMAL(10,2) DEFAULT 0.00,
  total_amount_due DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_billing_cycles_tenant ON billing_cycles(tenant_id, cycle_start);
```

---

## Billing Logic Updates

### 1. Enhanced Call Cost Tracking

```typescript
// In openai-webhook route, after call ends
async function chargeForCall(callId: string, tenantId: string, callStats: any) {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      wallet_balance: true,
      pricing_tier: true,
      included_calls_per_month: true,
      overage_rate: true,
      calls_used_this_cycle: true,
      billing_cycle_start: true
    }
  });

  // Calculate OpenAI cost (from call_logs table)
  const openaiCost = callStats.totalCost; // Already calculated in webhook

  // Calculate Twilio cost
  const callDurationMinutes = callStats.durationSeconds / 60;
  const twilioCost = callDurationMinutes * 0.013 * 2; // Inbound + outbound

  // Total direct cost
  const totalDirectCost = openaiCost + twilioCost;

  // Determine if this is a free included call or overage
  const isIncludedCall = tenant.calls_used_this_cycle < tenant.included_calls_per_month;
  const chargeAmount = isIncludedCall ? 0 : tenant.overage_rate;

  // Platform fee/markup (difference between charge and cost)
  const platformFee = chargeAmount - totalDirectCost;

  // Deduct from wallet (only for overage calls)
  if (chargeAmount > 0) {
    const newBalance = tenant.wallet_balance - chargeAmount;

    await prisma.$transaction([
      prisma.tenants.update({
        where: { id: tenantId },
        data: {
          wallet_balance: newBalance,
          calls_used_this_cycle: tenant.calls_used_this_cycle + 1
        }
      }),

      prisma.wallet_transactions.create({
        data: {
          tenant_id: tenantId,
          amount: -chargeAmount,
          type: 'ai_call_cost',
          description: `${isIncludedCall ? 'Included' : 'Overage'} call ${callId}`,
          related_call_log_id: callId,
          balance_before: tenant.wallet_balance,
          balance_after: newBalance,
          openai_cost: openaiCost,
          twilio_cost: twilioCost,
          platform_fee: platformFee,
          cost_breakdown: {
            openai: openaiCost,
            twilio: twilioCost,
            platform_fee: platformFee,
            call_duration_seconds: callStats.durationSeconds,
            is_included: isIncludedCall
          }
        }
      })
    ]);

    console.log(`💰 ${isIncludedCall ? 'Included' : 'Overage'} call charged: $${chargeAmount.toFixed(4)}`);
  } else {
    // Free included call, just increment counter
    await prisma.tenants.update({
      where: { id: tenantId },
      data: { calls_used_this_cycle: tenant.calls_used_this_cycle + 1 }
    });

    console.log(`✅ Included call used: ${tenant.calls_used_this_cycle + 1}/${tenant.included_calls_per_month}`);
  }
}
```

### 2. Monthly Subscription Billing

```typescript
// Cron job: Run on 1st of every month
async function processMonthlyBilling() {
  const tenants = await prisma.tenants.findMany({
    where: { status: 'active' }
  });

  for (const tenant of tenants) {
    const cycleStart = new Date(tenant.billing_cycle_start);
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);

    // Calculate overage
    const overageCalls = Math.max(0, tenant.calls_used_this_cycle - tenant.included_calls_per_month);
    const overageCharges = overageCalls * tenant.overage_rate;

    const totalAmountDue = tenant.monthly_subscription_fee + overageCharges;

    // Deduct from wallet
    const newBalance = tenant.wallet_balance - totalAmountDue;

    await prisma.$transaction([
      // Deduct monthly fee from wallet
      prisma.tenants.update({
        where: { id: tenant.id },
        data: {
          wallet_balance: newBalance,
          calls_used_this_cycle: 0, // Reset for new cycle
          billing_cycle_start: cycleEnd // Move to next cycle
        }
      }),

      // Record transaction
      prisma.wallet_transactions.create({
        data: {
          tenant_id: tenant.id,
          amount: -totalAmountDue,
          type: 'monthly_subscription',
          description: `Monthly billing: $${tenant.monthly_subscription_fee} subscription + $${overageCharges.toFixed(2)} overage (${overageCalls} calls)`,
          balance_before: tenant.wallet_balance,
          balance_after: newBalance
        }
      }),

      // Create billing cycle record
      prisma.billing_cycles.create({
        data: {
          tenant_id: tenant.id,
          cycle_start: cycleStart,
          cycle_end: cycleEnd,
          subscription_fee: tenant.monthly_subscription_fee,
          included_calls: tenant.included_calls_per_month,
          total_calls: tenant.calls_used_this_cycle,
          overage_calls: overageCalls,
          overage_charges: overageCharges,
          total_amount_due: totalAmountDue,
          status: 'completed'
        }
      })
    ]);

    console.log(`📅 Monthly billing for ${tenant.name}: $${totalAmountDue.toFixed(2)}`);

    // Send invoice email
    await sendMonthlyInvoice(tenant.id, {
      subscriptionFee: tenant.monthly_subscription_fee,
      includedCalls: tenant.included_calls_per_month,
      totalCalls: tenant.calls_used_this_cycle,
      overageCalls: overageCalls,
      overageCharges: overageCharges,
      totalDue: totalAmountDue
    });
  }
}
```

---

## Profit Margin Analysis

### Scenario: 100 Restaurants

**Tier Distribution**:
- 40 restaurants on Starter ($25/month)
- 40 restaurants on Growth ($50/month)
- 20 restaurants on Professional ($99/month)

**Monthly Revenue**:
```
Subscription fees:
- 40 × $25 = $1,000
- 40 × $50 = $2,000
- 20 × $99 = $1,980
Total subscription: $4,980

Overage fees (assume 30% exceed limits):
- 12 Starter restaurants: 25 extra calls × $0.40 = $120
- 12 Growth restaurants: 50 extra calls × $0.35 = $210
- 6 Professional restaurants: 100 extra calls × $0.30 = $180
Total overage: $510

TOTAL REVENUE: $5,490/month
```

**Monthly Costs**:
```
Fixed infrastructure: $102
Twilio phone numbers: 100 × $1.15 = $115

Variable costs (assume 10,000 total calls):
- OpenAI: 10,000 × $0.10 avg = $1,000
- Twilio voice: 10,000 × 5 min × 0.013 × 2 = $1,300
Total variable: $2,300

TOTAL COSTS: $2,517/month
```

**Profit**:
```
Revenue: $5,490
Costs: $2,517
PROFIT: $2,973/month (~54% margin) ✅
ANNUAL PROFIT: ~$35,676
```

---

## Frontend: Pricing & Usage Dashboard

### Settings Page - Billing Section

```tsx
interface BillingInfo {
  pricingTier: string;
  monthlyFee: number;
  includedCalls: number;
  callsUsedThisCycle: number;
  overageRate: number;
  cycleStart: string;
  cycleEnd: string;
  estimatedBill: number;
}

export function BillingSection() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);

  return (
    <div className="glass-card p-6">
      <h2 className="text-2xl font-bold mb-4">Current Plan: {billing.pricingTier}</h2>

      {/* Usage Progress */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span>Calls Used This Month</span>
          <span className="font-bold">
            {billing.callsUsedThisCycle} / {billing.includedCalls}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-green-500 h-4 rounded-full"
            style={{
              width: `${Math.min(100, (billing.callsUsedThisCycle / billing.includedCalls) * 100)}%`
            }}
          />
        </div>
        {billing.callsUsedThisCycle > billing.includedCalls && (
          <p className="text-yellow-600 mt-2">
            ⚠️ {billing.callsUsedThisCycle - billing.includedCalls} overage calls at ${billing.overageRate}/call
          </p>
        )}
      </div>

      {/* Estimated Bill */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-sm text-gray-600">Estimated Bill This Cycle</p>
        <p className="text-3xl font-bold text-blue-600">${billing.estimatedBill.toFixed(2)}</p>
        <p className="text-xs text-gray-500">
          Billing cycle: {new Date(billing.cycleStart).toLocaleDateString()} - {new Date(billing.cycleEnd).toLocaleDateString()}
        </p>
      </div>

      {/* Upgrade Options */}
      <button className="btn-primary">Upgrade Plan</button>
    </div>
  );
}
```

---

## Recommendations

1. **Start with Model 2 (Base + Usage)**: Predictable revenue, covers fixed costs
2. **Pricing**: Starter $25, Growth $50, Pro $99
3. **Include generous call allowances** to make customers feel they're getting value
4. **Monitor usage patterns** for 3 months, then adjust pricing
5. **Offer annual discounts**: 2 months free if paid annually (increases retention)
6. **Free trial**: 14 days or 25 free calls (whichever comes first)

**Target Profit Margin**: 50-60% after all costs
