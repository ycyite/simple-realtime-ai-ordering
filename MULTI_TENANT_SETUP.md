# 🏢 Multi-Tenant Setup Guide

This guide walks you through setting up the multi-tenant system so each user gets their own restaurant automatically.

---

## 📋 Prerequisites

- ✅ Supabase project created with all tables from `DATABASE_SETUP.md`
- ✅ Row Level Security (RLS) disabled (see `DATABASE_RLS_NOTE.md`)
- ✅ Clerk account set up for authentication
- ✅ Railway deployment (or local development)

---

## 🔧 Step 1: Configure Clerk Webhook

The webhook automatically creates a tenant and user record when someone signs up.

### 1. Go to Clerk Dashboard

1. Visit [dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your application
3. Go to **Webhooks** in the left sidebar
4. Click **Add Endpoint**

### 2. Add Webhook Endpoint

**For Railway/Production:**
```
https://your-app.railway.app/api/webhooks/clerk
```

**For Local Development:**
```
https://your-ngrok-url.ngrok.io/api/webhooks/clerk
```

### 3. Subscribe to Events

Check these events:
- ✅ `user.created` (creates tenant when user signs up)
- ✅ `user.deleted` (deletes tenant when user is deleted)

### 4. Copy Signing Secret

1. After creating the webhook, copy the **Signing Secret** (starts with `whsec_...`)
2. Add to your environment variables:

**Railway:**
- Go to your Railway project
- Click **Variables**
- Add: `CLERK_WEBHOOK_SECRET=whsec_...`

**Local `.env.local`:**
```env
CLERK_WEBHOOK_SECRET=whsec_your_secret_here
```

---

## 🚀 Step 2: Test the Flow

### 1. Sign Up a New User

1. Go to your app's `/register` page
2. Sign up with a new account
3. The webhook will automatically:
   - ✅ Create a tenant with a unique slug
   - ✅ Link the user to the tenant
   - ✅ Give $10 starting credit
   - ✅ Set restaurant to "open" by default

### 2. Complete Onboarding

After signup, users are redirected to `/onboarding` where they can:
- Set their restaurant name
- Add phone number
- Add address

### 3. Start Using the App

After onboarding, users are redirected to `/orders` and can:
- ✅ Manage their menu
- ✅ View their orders
- ✅ Toggle restaurant open/closed
- ✅ Configure settings

---

## 🔍 Step 3: Verify in Database

Check your Supabase database to verify the data was created:

```sql
-- View all tenants
SELECT id, name, slug, wallet_balance, status FROM tenants;

-- View all users and their tenants
SELECT
  u.name,
  u.email,
  u.role,
  t.name as restaurant_name,
  t.slug
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id;
```

---

## 🎯 How Multi-Tenant Works

### Architecture

```
User Signs Up with Clerk
    ↓
Clerk sends webhook to /api/webhooks/clerk
    ↓
Webhook creates:
  1. Tenant record (restaurant)
  2. User record (linked to tenant)
    ↓
User completes /onboarding
    ↓
User redirected to /orders
    ↓
All API routes filter by user's tenant_id
```

### Data Isolation

Each API route ensures users only see their own data:

```typescript
// 1. Get authenticated user
const { userId } = await auth();

// 2. Find user's tenant
const user = await prisma.users.findUnique({
  where: { clerk_user_id: userId },
  select: { tenant_id: true }
});

// 3. Query only this tenant's data
const data = await prisma.menu_items.findMany({
  where: { tenant_id: user.tenant_id }  // ← Isolation
});
```

---

## 🛠️ Troubleshooting

### Webhook not firing?

1. **Check webhook URL is correct** - Must be publicly accessible
2. **Verify signing secret** - Copy from Clerk dashboard exactly
3. **Check logs** - Look at Railway logs or local console for errors
4. **Test webhook** - Use Clerk's "Send Example" button in webhook settings

### User not being created?

1. **Check Supabase logs** - Go to Supabase → Logs → Postgres Logs
2. **Verify tables exist** - Run SQL from `DATABASE_SETUP.md`
3. **Check RLS is disabled** - Run SQL from `DATABASE_RLS_NOTE.md`
4. **Look at app logs** - Check Railway or local console

### Onboarding page not showing?

1. **User might already have tenant** - Check database
2. **Clerk auth issue** - Make sure Clerk middleware is working
3. **Check redirect logic** - User should go to `/onboarding` after signup

---

## 🎉 What Users Get

When a new user signs up:

- ✅ **Their own tenant/restaurant** with unique URL slug
- ✅ **$10 starting credit** in their wallet
- ✅ **Owner role** with full permissions
- ✅ **Empty menu** ready to be populated
- ✅ **Restaurant set to "open"** by default

---

## 📚 Next Steps

1. **Customize onboarding** - Add more fields (logo, hours, etc.)
2. **Add sample menu items** - Give new users starter menu
3. **Email notifications** - Welcome email after signup
4. **Admin dashboard** - View all tenants as system admin
5. **Invite team members** - Let owners add staff users

---

## 🔐 Security Notes

- ✅ **Clerk handles authentication** - No password storage needed
- ✅ **Webhook is verified** - Uses Svix signature verification
- ✅ **Data is isolated** - Each tenant only sees their own data
- ✅ **API routes are protected** - All routes check authentication
- ✅ **No public data access** - Everything requires login

---

## 📊 Multi-Tenant Features

| Feature | Status |
|---------|--------|
| Auto tenant creation on signup | ✅ Implemented |
| User-tenant relationship | ✅ Implemented |
| Data isolation by tenant_id | ✅ Implemented |
| Onboarding flow | ✅ Implemented |
| Webhook verification | ✅ Implemented |
| Starting wallet credit | ✅ Implemented |
| Unique restaurant slugs | ✅ Implemented |
| Team member invites | ⏳ Coming soon |
| System admin dashboard | ⏳ Coming soon |
| Tenant billing/subscriptions | ⏳ Coming soon |
