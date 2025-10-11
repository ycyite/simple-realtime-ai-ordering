-- Add billing fields to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_fee DECIMAL(10,2) DEFAULT 10.00;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS low_balance_threshold DECIMAL(10,2) DEFAULT 10.00;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';

-- Add cost breakdown fields to wallet_transactions table
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS openai_cost DECIMAL(10,6);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS openai_charged DECIMAL(10,6);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS twilio_cost DECIMAL(10,6);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS platform_markup DECIMAL(10,6);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS balance_before DECIMAL(10,2);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS related_call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_call_log ON wallet_transactions(related_call_log_id);
