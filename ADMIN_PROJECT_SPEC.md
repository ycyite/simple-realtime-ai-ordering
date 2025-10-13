# Counter Bell - Admin Dashboard Project Specification

## Overview

This document specifies the requirements for building a **separate admin dashboard** for the Counter Bell AI ordering system. The admin dashboard is a standalone Next.js project that shares the same database but operates independently from the main restaurant application.

## Project Separation

- **Main App**: Restaurant-facing application (current project)
- **Admin App**: Platform administration dashboard (NEW project to be created)
- **Shared Resource**: PostgreSQL database (Supabase)

## Database Connection

### Connection String
Use the same `DATABASE_URL` from the main project:
```env
DATABASE_URL=postgresql://[same connection string as main app]
```

### Relevant Tables
The admin dashboard will primarily interact with these tables:

1. **system_admins** - Admin user accounts
   - `id` (UUID)
   - `clerk_user_id` (String) - Links to Clerk authentication
   - `email` (String)
   - `name` (String)
   - `role` (String) - Default: "admin"
   - `created_at` (Timestamp)
   - `last_login` (Timestamp)

2. **tenants** - Restaurant accounts
   - `id`, `name`, `slug`, `phone_number`
   - `wallet_balance`, `stripe_customer_id`
   - `status`, `is_open`
   - `subscription_fee`, `low_balance_threshold`

3. **wallet_transactions** - All billing transactions
4. **call_logs** - AI call records
5. **orders** - Customer orders
6. **users** - Restaurant staff/owners

### Prisma Schema
Copy the entire `schema.prisma` file from the main project to maintain consistency.

## Authentication Requirements

### Clerk Configuration

**IMPORTANT**: Only ONE admin account, no self-registration

1. **Create separate Clerk application** for admin dashboard
   - Name: "Counter Bell Admin"
   - Get new API keys (different from main app)

2. **Disable public sign-up**:
   - Clerk Dashboard → Settings → Restrictions
   - Turn OFF "Allow public sign-ups"
   - Only admins can be invited via Clerk Dashboard

3. **Admin account creation**:
   - Go to Clerk Dashboard → Users → Create User
   - Enter admin email and password
   - Copy the `clerk_user_id` after creation

4. **Sync admin to database**:
   ```sql
   INSERT INTO system_admins (clerk_user_id, email, name, role)
   VALUES ('user_xxxxxxxxxxxxx', 'admin@counterbell.com', 'Admin Name', 'admin');
   ```

### Authentication Flow

- **No registration page** - Only sign-in page at `/signin`
- Sign-in uses Clerk's `<SignIn />` component
- After successful login, redirect to `/dashboard`
- Protected routes check:
  1. User is authenticated via Clerk
  2. User's `clerk_user_id` exists in `system_admins` table

## Tech Stack (Match Main App)

```json
{
  "framework": "Next.js 15 (App Router)",
  "authentication": "Clerk (separate application)",
  "database": "Supabase PostgreSQL",
  "orm": "Prisma (same schema as main app)",
  "styling": "Tailwind CSS",
  "payments": "Stripe (view-only access)",
  "deployment": "Railway (separate service)"
}
```

## Required Pages

### 1. `/signin` - Sign In Page
- Use Clerk's `<SignIn />` component
- No "Register" link or tab
- Redirect to `/dashboard` on success
- Simple, clean design

### 2. `/dashboard` - Overview Dashboard
Display platform-wide statistics:
- **Total Restaurants**: Count of active tenants
- **Total Revenue**: Sum of all wallet recharges
- **Total Calls**: Count of call_logs
- **Total Orders**: Count of orders
- **Active Calls Right Now**: Count of recent call_logs (last 5 minutes)

Show recent activity:
- Last 10 wallet transactions across all tenants
- Last 10 orders across all restaurants

### 3. `/restaurants` - Restaurant Management
**Table view with columns**:
- Restaurant Name
- Phone Number
- Wallet Balance (color-coded: red if < $10, green if > $50)
- Status (active/suspended)
- Is Open (Yes/No)
- Total Calls
- Total Orders
- Created Date
- Actions: View Details, Edit, Suspend/Activate

**Features**:
- Search by name/phone
- Filter by status (active/suspended)
- Sort by balance, created date, total calls

**Actions**:
- Click restaurant name → View details page
- "Add Credit" button → Manually add funds to wallet
- "Suspend/Activate" toggle

### 4. `/restaurants/[id]` - Restaurant Detail Page
**Restaurant Overview**:
- Name, phone, address, slug
- Wallet balance with transaction history
- Current settings (AI prompt, menu items)
- Staff members and roles

**Tabs**:
1. **Overview** - Key stats and info
2. **Wallet Transactions** - Full transaction history with pagination
3. **Call Logs** - All calls with token usage and costs
4. **Orders** - All orders placed
5. **Settings** - View/edit restaurant settings

**Admin Actions**:
- Manually add/deduct wallet balance (with reason)
- View full call transcripts
- View detailed token usage per call
- Export data (CSV)

### 5. `/transactions` - All Transactions
Platform-wide transaction log:
- Restaurant name
- Type (recharge/deduction/call_cost)
- Amount
- Balance after
- Stripe payment ID (if applicable)
- Timestamp

**Filters**:
- Date range picker
- Transaction type
- Restaurant
- Amount range

**Export**: CSV download

### 6. `/calls` - All Call Logs
Platform-wide call records:
- Restaurant name
- Caller phone number
- Duration
- Total tokens used
- Cost breakdown (text/audio input/output)
- Order ID (if call resulted in order)
- Timestamp

**Filters**:
- Date range
- Restaurant
- Has order (Yes/No)
- Cost range

**Features**:
- Click call → View full transcript
- View token usage breakdown

### 7. `/analytics` - Platform Analytics
**Charts and Graphs** (using Chart.js or Recharts):
1. **Revenue Over Time** - Line chart of daily/weekly/monthly recharges
2. **Calls Over Time** - Bar chart of calls per day/week/month
3. **Top Restaurants by Revenue** - Bar chart
4. **Top Restaurants by Call Volume** - Bar chart
5. **Average Cost per Call** - Line chart over time
6. **Token Usage Breakdown** - Pie chart (text vs audio tokens)

**Date range selector**: Last 7 days, 30 days, 3 months, 1 year, custom

### 8. `/settings` - Admin Settings
- View admin account info (email, name, last login)
- Change password (via Clerk)
- Platform settings:
  - Global markup percentage (default: 20%)
  - Low balance alert threshold
  - Default subscription fee

## API Routes Required

### `/api/admin/stats` - Dashboard Statistics
```typescript
GET /api/admin/stats
Returns:
{
  totalRestaurants: number,
  totalRevenue: number,
  totalCalls: number,
  totalOrders: number,
  activeCalls: number,
  recentTransactions: Transaction[],
  recentOrders: Order[]
}
```

### `/api/admin/restaurants` - Restaurant List
```typescript
GET /api/admin/restaurants?search=&status=&page=1&limit=20
Returns: { restaurants: Tenant[], total: number, page: number }
```

### `/api/admin/restaurants/[id]` - Restaurant Details
```typescript
GET /api/admin/restaurants/[id]
Returns: Full tenant data with relations
```

### `/api/admin/wallet/adjust` - Manual Wallet Adjustment
```typescript
POST /api/admin/wallet/adjust
Body: {
  tenantId: string,
  amount: number, // positive = add, negative = deduct
  reason: string,
  adminId: string
}
```

### `/api/admin/transactions` - Transaction List
```typescript
GET /api/admin/transactions?restaurant=&type=&startDate=&endDate=&page=1
Returns: { transactions: Transaction[], total: number }
```

### `/api/admin/calls` - Call Logs
```typescript
GET /api/admin/calls?restaurant=&startDate=&endDate=&page=1
Returns: { calls: CallLog[], total: number }
```

### `/api/admin/analytics` - Analytics Data
```typescript
GET /api/admin/analytics?period=30days
Returns: {
  revenueOverTime: { date: string, amount: number }[],
  callsOverTime: { date: string, count: number }[],
  topRestaurantsByRevenue: { name: string, revenue: number }[],
  // ... other chart data
}
```

## Authorization Middleware

Create `lib/adminAuth.ts`:
```typescript
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function getAdminUser() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const admin = await prisma.system_admins.findUnique({
    where: { clerk_user_id: userId }
  });

  if (!admin) {
    throw new Error('Not an admin user');
  }

  // Update last login
  await prisma.system_admins.update({
    where: { id: admin.id },
    data: { last_login: new Date() }
  });

  return admin;
}
```

Use in all API routes:
```typescript
export async function GET(request: Request) {
  try {
    const admin = await getAdminUser(); // Throws if not admin

    // ... your API logic
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

## Protected Routes Component

Create `components/AdminRoute.tsx`:
```typescript
'use client';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Check if user is admin
      fetch('/api/admin/verify')
        .then(res => res.json())
        .then(data => {
          if (data.isAdmin) {
            setIsAdmin(true);
          } else {
            router.push('/signin');
          }
          setLoading(false);
        });
    } else if (isLoaded && !isSignedIn) {
      router.push('/signin');
    }
  }, [isLoaded, isSignedIn, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAdmin ? <>{children}</> : null;
}
```

Wrap all pages (except `/signin`) with this component.

## Environment Variables

Create `.env.local`:
```env
# Database (same as main app)
DATABASE_URL=postgresql://[connection_string]

# Clerk (NEW application for admin)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# App URL
NEXT_PUBLIC_URL=https://admin.counterbell.app
```

## Project Structure

```
counter-bell-admin/
├── app/
│   ├── layout.tsx
│   ├── signin/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── restaurants/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── transactions/
│   │   └── page.tsx
│   ├── calls/
│   │   └── page.tsx
│   ├── analytics/
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   └── api/
│       └── admin/
│           ├── stats/route.ts
│           ├── restaurants/route.ts
│           ├── transactions/route.ts
│           ├── calls/route.ts
│           ├── analytics/route.ts
│           ├── wallet/adjust/route.ts
│           └── verify/route.ts
├── components/
│   ├── AdminRoute.tsx
│   ├── Navigation.tsx
│   ├── StatCard.tsx
│   └── DataTable.tsx
├── lib/
│   ├── prisma.ts
│   └── adminAuth.ts
├── prisma/
│   └── schema.prisma (copy from main app)
├── .env.local
├── package.json
└── tsconfig.json
```

## UI/UX Guidelines

### Navigation
Side navigation bar with:
- Logo + "Admin Dashboard"
- Dashboard
- Restaurants
- Transactions
- Calls
- Analytics
- Settings
- Sign Out (bottom)

### Color Scheme
- Primary: Dark teal (#174D5A)
- Success: Green (#10b981)
- Warning: Yellow (#f59e0b)
- Danger: Red (#ef4444)
- Background: Light gray (#f9fafb)

### Tables
- Pagination (20 items per page)
- Sortable columns
- Search/filter bar at top
- Export button (CSV)
- Responsive design

### Stats Cards
Dashboard stat cards should show:
- Big number (metric)
- Label
- Trend indicator (up/down % vs last period)
- Icon

## Security Considerations

1. **No public routes** except `/signin`
2. **All API routes** must verify admin via `getAdminUser()`
3. **Read-only Stripe access** - No payment modifications from admin
4. **Audit trail** - Log all manual wallet adjustments with admin ID
5. **No tenant data modification** - Only view and wallet adjustments
6. **Rate limiting** - Implement on API routes (100 req/min per admin)

## Development Steps

1. **Initialize Next.js project**:
   ```bash
   npx create-next-app@latest counter-bell-admin --typescript --tailwind --app
   ```

2. **Install dependencies**:
   ```bash
   npm install @clerk/nextjs @prisma/client
   npm install -D prisma
   ```

3. **Copy Prisma schema** from main app

4. **Generate Prisma client**:
   ```bash
   npx prisma generate
   ```

5. **Set up Clerk** (new application)

6. **Create admin account** in Clerk Dashboard

7. **Seed admin to database**:
   ```bash
   npx prisma db push
   # Then manually insert into system_admins table
   ```

8. **Build pages** in this order:
   - `/signin` (authentication first)
   - `/dashboard` (basic stats)
   - `/restaurants` (core functionality)
   - `/restaurants/[id]` (detail view)
   - `/transactions` (financial tracking)
   - `/calls` (usage monitoring)
   - `/analytics` (insights)
   - `/settings` (configuration)

9. **Deploy to Railway** as separate service

## Testing Checklist

- [ ] Only admin can sign in (non-admins redirected)
- [ ] Cannot access any page without authentication
- [ ] Dashboard shows correct statistics
- [ ] Can search/filter restaurants
- [ ] Can view restaurant details
- [ ] Can manually adjust wallet balance
- [ ] Transaction history loads correctly
- [ ] Call logs display with proper cost calculations
- [ ] Analytics charts render with real data
- [ ] Export to CSV works
- [ ] All API routes verify admin authorization

## Future Enhancements (Phase 2)

- Multiple admin accounts with different permission levels
- Email notifications for low restaurant balances
- Automated reports (weekly/monthly summaries)
- Restaurant suspension reasons and notes
- Bulk operations (e.g., credit multiple restaurants)
- Advanced filtering and saved filter presets
- Webhook management for platform events
- API usage monitoring per restaurant

---

**Important Notes**:
- This is a **separate codebase** from the main restaurant app
- **Shares the database** but has independent authentication
- **Deploy separately** to Railway (different service)
- **Use environment variables** to point to same database
- **Only ONE admin account** initially (can expand later)
