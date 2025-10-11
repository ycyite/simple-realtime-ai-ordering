-- Add auto-recharge fields to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auto_recharge_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auto_recharge_threshold DECIMAL(10,2) DEFAULT 10.00;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auto_recharge_amount DECIMAL(10,2) DEFAULT 50.00;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auto_recharge_monthly_limit DECIMAL(10,2);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auto_recharge_this_month DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auto_recharge_month_reset DATE;

-- Add stripe customer ID for saved payment methods
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_tenants_auto_recharge ON tenants(auto_recharge_enabled, wallet_balance);

-- Add comments for clarity
COMMENT ON COLUMN tenants.auto_recharge_enabled IS 'Whether auto-recharge is enabled (false = manual recharge only)';
COMMENT ON COLUMN tenants.auto_recharge_threshold IS 'Trigger auto-recharge when balance drops below this amount';
COMMENT ON COLUMN tenants.auto_recharge_amount IS 'Amount to recharge to when auto-recharge triggers';
COMMENT ON COLUMN tenants.auto_recharge_monthly_limit IS 'Maximum auto-recharge amount per month (NULL = no limit)';
COMMENT ON COLUMN tenants.auto_recharge_this_month IS 'Total amount auto-recharged this month';
COMMENT ON COLUMN tenants.auto_recharge_month_reset IS 'Date when monthly limit resets';
COMMENT ON COLUMN tenants.stripe_customer_id IS 'Stripe customer ID for saved payment methods';
