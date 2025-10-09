# 🔐 Row Level Security (RLS) Configuration

## Important: Disable RLS for Clerk Authentication

Since this application uses **Clerk for authentication** (not Supabase Auth), the RLS policies in `DATABASE_SETUP.md` that check `auth.jwt()` will **not work**.

### Option 1: Disable RLS (Recommended for this setup)

Run this SQL in your Supabase SQL Editor to disable RLS on all tables:

```sql
-- Disable Row Level Security
ALTER TABLE system_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies (if you created them)
DROP POLICY IF EXISTS "Admins view all tenants" ON tenants;
DROP POLICY IF EXISTS "Admins view all orders" ON orders;
DROP POLICY IF EXISTS "Admins view all menu items" ON menu_items;
DROP POLICY IF EXISTS "Admins view all transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Users view own tenant" ON tenants;
DROP POLICY IF EXISTS "Users view own menu" ON menu_items;
DROP POLICY IF EXISTS "Users insert own menu" ON menu_items;
DROP POLICY IF EXISTS "Users update own menu" ON menu_items;
DROP POLICY IF EXISTS "Users view own orders" ON orders;
DROP POLICY IF EXISTS "Users update own orders" ON orders;
DROP POLICY IF EXISTS "Users view own wallet" ON wallet_transactions;
DROP POLICY IF EXISTS "Users view own call logs" ON call_logs;
```

### Why Disable RLS?

1. **Authentication is handled by Clerk** - All API routes check `await auth()` from Clerk
2. **Tenant isolation happens in Next.js** - Each API route queries by the user's `tenant_id`
3. **Security is maintained** - Users can only access their own data because:
   - API routes require authentication via Clerk middleware
   - Queries filter by the authenticated user's tenant ID
   - No direct database access from the frontend

### Security Model

```
User Request
    ↓
Clerk Middleware (checks auth)
    ↓
Next.js API Route (validates user & tenant)
    ↓
Prisma Query (filters by tenant_id)
    ↓
Database (no RLS needed)
```

### Example from menu/route.ts:

```typescript
// 1. Check Clerk authentication
const { userId } = await auth();
if (!userId) return unauthorized;

// 2. Get user's tenant
const user = await prisma.users.findUnique({
  where: { clerk_user_id: userId },
  select: { tenant_id: true }
});

// 3. Query only this tenant's data
const menuItems = await prisma.menu_items.findMany({
  where: { tenant_id: user.tenant_id }  // ← Tenant isolation
});
```

### Alternative: Use Supabase Service Role

If you prefer to keep RLS enabled, you can bypass it by using the Supabase **service role key**:

1. Go to Supabase **Project Settings** → **API**
2. Copy the **service_role** key (NOT the anon key)
3. Update your `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true&connection_limit=1"
   SUPABASE_SERVICE_ROLE_KEY="eyJ..."
   ```

However, **disabling RLS is simpler** for this Clerk-based architecture.
