-- Add billing-related columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_fee DECIMAL(10,2) DEFAULT 10.00;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_start_date DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS next_billing_date DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS low_balance_threshold DECIMAL(10,2) DEFAULT 10.00;

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,

  -- Cost breakdown
  openai_cost DECIMAL(10,6),
  openai_charged DECIMAL(10,6),
  twilio_cost DECIMAL(10,6),
  platform_markup DECIMAL(10,6),

  -- References
  stripe_payment_intent_id VARCHAR(255),
  related_call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,

  -- Balance tracking
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_tenant ON wallet_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);

-- Create subscription_billings table
CREATE TABLE IF NOT EXISTS subscription_billings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  subscription_fee DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'paid',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_billings_tenant ON subscription_billings(tenant_id, billing_period_start);
