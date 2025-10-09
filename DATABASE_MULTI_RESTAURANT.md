# 🏢 Multi-Restaurant Support

## Database Schema Update

To support users working at multiple restaurants, we need a many-to-many relationship.

### Current Structure (One-to-Many):
```
users.tenant_id → tenants.id
❌ User can only belong to ONE tenant
```

### New Structure (Many-to-Many):
```
users ←→ user_tenants ←→ tenants
✅ User can belong to MULTIPLE tenants with different roles
```

## SQL Migration

Run this in your Supabase SQL Editor:

```sql
-- Create junction table for many-to-many relationship
CREATE TABLE user_tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'staff', -- 'owner', 'manager', 'staff'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, tenant_id) -- Prevent duplicate entries
);

-- Add indexes for performance
CREATE INDEX idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant_id ON user_tenants(tenant_id);

-- Migrate existing data from users table
INSERT INTO user_tenants (user_id, tenant_id, role)
SELECT id, tenant_id, role
FROM users
WHERE tenant_id IS NOT NULL;

-- Remove old columns from users table
ALTER TABLE users DROP COLUMN tenant_id;
ALTER TABLE users DROP COLUMN role;

-- Optional: Add last_active_tenant to track which restaurant user was viewing
ALTER TABLE users ADD COLUMN last_active_tenant_id UUID REFERENCES tenants(id);
```

## Benefits

✅ **User can work at multiple restaurants**
- Part-time worker at 3 different restaurants
- Manager at 2 locations
- Owner of multiple restaurant chains

✅ **Different roles per restaurant**
- Owner at Restaurant A
- Manager at Restaurant B
- Staff at Restaurant C

✅ **Flexible access control**
- User sees all their restaurants in dashboard
- Can switch between restaurants
- Each restaurant has isolated data

## User Flow

1. **Sign up** → User record created
2. **Restaurant Dashboard** → Shows:
   - Restaurants where I'm owner/manager/staff
   - Button to create new restaurant
   - Button to join existing restaurant (invite code)
3. **Select Restaurant** → Work with that restaurant's data
4. **Switch Restaurant** → Navigation has restaurant switcher
