# 🗄️ Database Setup Guide - Supabase

Complete guide for setting up your Supabase database with user roles and permissions.

---

## 📋 Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in details:
   - **Project name**: `counter-bell` or `ai-ordering-system`
   - **Database password**: Create a strong password (save it!)
   - **Region**: Choose closest to your Railway deployment
4. Click **"Create new project"** (takes ~2 minutes)

---

## 👥 User Roles & Permissions

### **1. System Admin** (You - Platform Owner)
**Access Level:** Everything across all tenants

**Permissions:**
- ✅ View all restaurants/tenants
- ✅ View all orders across all tenants
- ✅ View all revenue/transactions
- ✅ Manage pricing/billing
- ✅ Suspend/activate tenant accounts
- ✅ View system-wide analytics
- ✅ Access admin dashboard at `/admin`
- ✅ Support tickets/chat
- ✅ Manage platform settings

**Dashboard Routes:**
- `/admin/dashboard` - System overview (revenue, active restaurants, orders)
- `/admin/tenants` - All restaurants management
- `/admin/transactions` - All payments and wallet activity
- `/admin/analytics` - Platform-wide analytics
- `/admin/support` - Customer support tickets

---

### **2. Restaurant Owner** (Your Customers)
**Access Level:** Full control of their restaurant only

**Permissions:**
- ✅ Manage their menu
- ✅ View/manage their orders
- ✅ Configure restaurant settings
- ✅ View their wallet balance
- ✅ Top up wallet credits
- ✅ View their analytics
- ✅ Invite/manage staff users
- ✅ View call logs
- ❌ Cannot see other restaurants' data

**Dashboard Routes:**
- `/orders` - Their orders only
- `/menu` - Their menu management
- `/settings` - Their restaurant settings
- `/wallet` - Their wallet and transactions
- `/analytics` - Their usage analytics

---

### **3. Restaurant Manager** (Optional)
**Access Level:** Most management tasks for their restaurant

**Permissions:**
- ✅ Manage menu (add/edit items)
- ✅ View/manage orders
- ✅ View analytics
- ✅ Edit restaurant settings
- ❌ Cannot manage wallet/billing
- ❌ Cannot invite users
- ❌ Cannot delete restaurant

---

### **4. Restaurant Staff** (Optional)
**Access Level:** Order management only

**Permissions:**
- ✅ View orders
- ✅ Accept/complete orders
- ❌ Cannot edit menu
- ❌ Cannot change settings
- ❌ Cannot view wallet/billing
- ❌ Cannot view analytics

---

## 📊 Step 2: Create Database Tables

Go to **SQL Editor** in Supabase and run this complete schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SYSTEM ADMINS TABLE (Platform Owners)
-- ============================================
CREATE TABLE system_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin', -- 'super_admin', 'admin', 'support'
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- ============================================
-- TENANTS/RESTAURANTS TABLE
-- ============================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  address TEXT,

  -- Wallet & Billing
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  stripe_customer_id VARCHAR(100),

  -- Twilio Phone Number (for receiving calls)
  twilio_phone_number VARCHAR(20) UNIQUE,

  -- Restaurant Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'suspended', 'trial', 'cancelled'
  is_open BOOLEAN DEFAULT true, -- Real-time open/closed status

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  settings JSONB
);

-- ============================================
-- RESTAURANT USERS TABLE (Owners, Managers, Staff)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'owner', -- 'owner', 'manager', 'staff'
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- ============================================
-- MENU ITEMS TABLE
-- ============================================
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100),
  available BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'undealt', -- 'undealt', 'preparing', 'completed', 'cancelled'
  source VARCHAR(50) DEFAULT 'phone', -- 'phone', 'web', 'app'
  pickup_time VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- WALLET TRANSACTIONS TABLE
-- ============================================
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'top_up', 'call_charge', 'refund', 'bonus'
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  description TEXT,
  stripe_payment_intent_id VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- CALL LOGS TABLE (Analytics)
-- ============================================
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  call_sid VARCHAR(100),
  from_number VARCHAR(20),
  duration INTEGER, -- in seconds

  -- Token usage breakdown (for accurate metering)
  cached_text_input_tokens INTEGER DEFAULT 0,
  uncached_text_input_tokens INTEGER DEFAULT 0,
  cached_audio_input_tokens INTEGER DEFAULT 0,
  uncached_audio_input_tokens INTEGER DEFAULT 0,
  text_output_tokens INTEGER DEFAULT 0,
  audio_output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,

  -- Cost calculation
  cost DECIMAL(10,4),

  recording_url TEXT,
  transcript TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_menu_items_tenant_id ON menu_items(tenant_id);
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_wallet_transactions_tenant_id ON wallet_transactions(tenant_id);
CREATE INDEX idx_call_logs_tenant_id ON call_logs(tenant_id);
```

---

## 🔐 Step 3: Enable Row Level Security (RLS)

Run this SQL to enable security policies:

```sql
-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================
ALTER TABLE system_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: SYSTEM ADMINS (View Everything)
-- ============================================

-- Admins can view all tenants
CREATE POLICY "Admins view all tenants"
ON tenants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM system_admins
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Admins can view all orders
CREATE POLICY "Admins view all orders"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM system_admins
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Admins can view all menu items
CREATE POLICY "Admins view all menu items"
ON menu_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM system_admins
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Admins can view all wallet transactions
CREATE POLICY "Admins view all transactions"
ON wallet_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM system_admins
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- ============================================
-- RLS POLICIES: RESTAURANT USERS (View Own Data Only)
-- ============================================

-- Users can view their own tenant info
CREATE POLICY "Users view own tenant"
ON tenants FOR SELECT
USING (
  id IN (
    SELECT tenant_id FROM users
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Users can view/manage their own menu items
CREATE POLICY "Users view own menu"
ON menu_items FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM users
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

CREATE POLICY "Users insert own menu"
ON menu_items FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM users
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
    AND role IN ('owner', 'manager')
  )
);

CREATE POLICY "Users update own menu"
ON menu_items FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM users
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
    AND role IN ('owner', 'manager')
  )
);

-- Users can view/manage their own orders
CREATE POLICY "Users view own orders"
ON orders FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM users
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

CREATE POLICY "Users update own orders"
ON orders FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM users
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Users can view their own wallet transactions
CREATE POLICY "Users view own wallet"
ON wallet_transactions FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM users
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Users can view their own call logs
CREATE POLICY "Users view own call logs"
ON call_logs FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM users
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);
```

---

## 🔗 Step 4: Get Connection String

1. Go to **Project Settings** → **Database**
2. Find **Connection string** section
3. Copy the **URI** (Session mode):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

4. Add to your `.env.local`:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

---

## 🧪 Step 5: Insert Test Data

**Create your first system admin (YOU):**

```sql
-- Replace with your Clerk user ID and email
INSERT INTO system_admins (clerk_user_id, email, name, role)
VALUES ('user_xxxxxxxxxxxxx', 'your@email.com', 'Your Name', 'super_admin');
```

**Create a test restaurant:**

```sql
-- Create test tenant
INSERT INTO tenants (name, slug, phone_number, wallet_balance)
VALUES ('Joe''s Pizza', 'joes-pizza', '+15551234567', 50.00)
RETURNING id;

-- Note the returned UUID, then create a test user for this tenant
-- Replace clerk_user_id with a test user
INSERT INTO users (tenant_id, clerk_user_id, email, name, role)
VALUES
  ('<TENANT_ID_FROM_ABOVE>', 'user_test123', 'owner@joespizza.com', 'Joe', 'owner');

-- Add some menu items
INSERT INTO menu_items (tenant_id, name, description, price, category)
VALUES
  ('<TENANT_ID_FROM_ABOVE>', 'Margherita Pizza', 'Classic tomato and mozzarella', 12.99, 'Pizza'),
  ('<TENANT_ID_FROM_ABOVE>', 'Pepperoni Pizza', 'Loaded with pepperoni', 14.99, 'Pizza'),
  ('<TENANT_ID_FROM_ABOVE>', 'Caesar Salad', 'Fresh romaine with caesar dressing', 8.99, 'Salads');
```

---

## ✅ Verification Checklist

- [ ] Supabase project created
- [ ] All tables created (9 tables total)
- [ ] Row Level Security enabled on all tables
- [ ] RLS policies created for admins and users
- [ ] Indexes created for performance
- [ ] Connection string saved to `.env.local`
- [ ] System admin account created for yourself
- [ ] Test tenant and user created

---

## 🚀 Next Steps

1. **Install Prisma**:
   ```bash
   npm install prisma @prisma/client
   npx prisma init
   ```

2. **Generate Prisma schema from database**:
   ```bash
   npx prisma db pull
   npx prisma generate
   ```

3. **Update your Next.js app** to use Prisma instead of JSON files

4. **Build admin dashboard** at `/admin`

---

## 📚 User Role Summary Table

| Role | View All Tenants | Manage Own Tenant | Manage Menu | Manage Orders | View Wallet | Top-up Wallet | View Analytics | Admin Dashboard |
|------|------------------|-------------------|-------------|---------------|-------------|---------------|----------------|-----------------|
| **System Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Restaurant Owner** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Restaurant Manager** | ❌ | ✅ | ✅ | ✅ | ✅ (view) | ❌ | ✅ | ❌ |
| **Restaurant Staff** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🔧 Troubleshooting

**Can't connect to database?**
- Check your password is correct in the connection string
- Make sure you're using the correct connection string format
- Verify your IP is allowed (Supabase allows all IPs by default)

**RLS policies not working?**
- Make sure JWT contains correct `sub` field (Clerk user ID)
- Check policies are enabled: `SELECT * FROM pg_policies;`
- Test with `SET ROLE authenticated;` in SQL editor

**Need to reset?**
- Go to SQL Editor and run: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
- Then re-run all table creation SQL
