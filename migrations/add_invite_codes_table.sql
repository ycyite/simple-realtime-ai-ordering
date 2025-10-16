-- Create invite_codes table for one-time use invite codes
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'staff', -- 'manager' or 'staff'
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_invite_codes_tenant_id ON invite_codes(tenant_id);
CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_is_used ON invite_codes(is_used);

-- Remove invite_code from tenants settings (optional cleanup)
-- UPDATE tenants SET settings = settings - 'invite_code';
