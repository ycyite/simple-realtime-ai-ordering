# 🚀 AI Restaurant Ordering System - SaaS Platform Roadmap

## Executive Summary

Transform the current demo into a **multi-tenant SaaS platform** where restaurants can:
- Sign up and get their own AI phone ordering system
- Manage their menu, orders, and settings independently
- Get dedicated phone numbers for customer calls
- Access analytics and insights
- Pay-as-you-go with wallet/credit system (top-up model)

---

## 📋 Phase 1: Multi-Tenant Architecture (Weeks 1-2)

### 1.1 Database Architecture

**Current**: JSON files (menu.json, orders.json)
**Target**: PostgreSQL or MongoDB with tenant isolation

#### Database Schema

```sql
-- Tenants/Restaurants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  stripe_customer_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  settings JSONB
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'staff', -- owner, manager, staff
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Menus
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100),
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'undealt', -- undealt, preparing, completed, cancelled
  source VARCHAR(50) DEFAULT 'phone', -- phone, web, app
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Call Logs (for analytics)
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  call_sid VARCHAR(100),
  from_number VARCHAR(20),
  duration INTEGER,
  recording_url TEXT,
  transcript TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Wallet Transactions (for tracking top-ups and usage)
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'top_up', 'call_charge', 'refund'
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  description TEXT,
  stripe_payment_intent_id VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage Tracking
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  metric_type VARCHAR(50), -- calls, orders, api_requests
  count INTEGER DEFAULT 0,
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 1.2 Tenant Isolation Strategy

**Recommended Approach**: Row-level security with tenant_id

**Implementation:**
```typescript
// middleware/tenant.ts
export async function getTenantId(req: Request): Promise<string> {
  const { user } = await getSession(req);
  if (!user?.tenantId) throw new Error('No tenant context');
  return user.tenantId;
}

// Example API route with tenant isolation
export async function GET(request: Request) {
  const tenantId = await getTenantId(request);

  const orders = await prisma.order.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(orders);
}
```

### 1.3 Subdomain/Domain Routing

```
restaurant1.yourdomain.com → Tenant: restaurant1
restaurant2.yourdomain.com → Tenant: restaurant2
app.yourdomain.com → Admin dashboard
```

**Implementation using Next.js middleware:**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];

  if (subdomain !== 'app' && subdomain !== 'www') {
    // Restaurant subdomain - inject tenant context
    request.headers.set('x-tenant-slug', subdomain);
  }

  return NextResponse.next({ request });
}
```

---

## 📋 Phase 2: Authentication & Authorization (Weeks 3-4)

### 2.1 Replace Mock Auth with Real System

**Technology Choice**: NextAuth.js v5 (Auth.js)

**Why NextAuth.js:**
- Native Next.js integration
- Supports multiple providers (email, OAuth)
- Built-in session management
- Free and open source

### 2.2 User Roles & Permissions

```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',  // Your team
  OWNER = 'owner',               // Restaurant owner
  MANAGER = 'manager',           // Can manage orders, menu
  STAFF = 'staff'                // View-only
}

interface Permission {
  manage_menu: boolean;
  manage_orders: boolean;
  manage_users: boolean;
  view_analytics: boolean;
  manage_billing: boolean;
  manage_settings: boolean;
}

const rolePermissions: Record<UserRole, Permission> = {
  super_admin: { /* all true */ },
  owner: { /* all true except manage_billing for super_admin */ },
  manager: { manage_menu: true, manage_orders: true, ... },
  staff: { /* mostly false, view only */ }
};
```

### 2.3 Implementation Tasks

- [ ] Install NextAuth.js: `npm install next-auth@beta`
- [ ] Create auth configuration file
- [ ] Set up credentials provider (email/password)
- [ ] Add OAuth providers (Google, optional)
- [ ] Implement JWT strategy with tenant context
- [ ] Create protected route middleware
- [ ] Add role-based access control
- [ ] Implement password reset flow
- [ ] Add email verification

**Example NextAuth config:**
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true }
        });

        if (user && bcrypt.compareSync(credentials.password, user.passwordHash)) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
            tenantSlug: user.tenant.slug
          };
        }
        return null;
      }
    })
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.role = token.role;
      session.user.tenantId = token.tenantId;
      session.user.tenantSlug = token.tenantSlug;
      return session;
    }
  }
};

export const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

---

## 📋 Phase 3: Database Migration (Weeks 5-6)

### 3.1 Technology Stack

**Recommended**: PostgreSQL with Prisma ORM

**Why:**
- Strong ACID compliance
- Excellent for structured data
- Great JSON support (JSONB)
- Perfect for analytics
- Prisma provides type-safe queries

**Hosting Options:**
1. **Supabase** (Recommended for MVP) - $25/month, includes auth
2. **Neon** - Serverless PostgreSQL, generous free tier
3. **Railway** - Simple deployment, $5/month
4. **AWS RDS** - Production scale, more expensive

### 3.2 Prisma Setup

**Installation:**
```bash
npm install @prisma/client
npm install -D prisma
npx prisma init
```

**Prisma Schema Example:**
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id                 String   @id @default(uuid())
  name               String
  slug               String   @unique
  phoneNumber        String?  @map("phone_number")
  subscriptionTier   String   @default("starter") @map("subscription_tier")
  subscriptionStatus String   @default("active") @map("subscription_status")
  stripeCustomerId   String?  @map("stripe_customer_id")
  settings           Json?
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  users              User[]
  menuItems          MenuItem[]
  orders             Order[]
  callLogs           CallLog[]
  subscriptions      Subscription[]

  @@map("tenants")
}

model User {
  id           String   @id @default(uuid())
  tenantId     String   @map("tenant_id")
  email        String   @unique
  phone        String?
  passwordHash String   @map("password_hash")
  name         String
  role         String   @default("staff")
  createdAt    DateTime @default(now()) @map("created_at")
  lastLogin    DateTime? @map("last_login")

  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("users")
}

model MenuItem {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  name        String
  description String?
  price       Decimal  @db.Decimal(10, 2)
  category    String?
  available   Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("menu_items")
}

model Order {
  id             String   @id @default(uuid())
  tenantId       String   @map("tenant_id")
  customerName   String?  @map("customer_name")
  customerPhone  String?  @map("customer_phone")
  items          Json
  totalAmount    Decimal  @db.Decimal(10, 2) @map("total_amount")
  status         String   @default("undealt")
  source         String   @default("phone")
  notes          String?
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  tenant         Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  callLogs       CallLog[]

  @@map("orders")
}

model CallLog {
  id           String   @id @default(uuid())
  tenantId     String   @map("tenant_id")
  orderId      String?  @map("order_id")
  callSid      String?  @map("call_sid")
  fromNumber   String?  @map("from_number")
  duration     Int?
  recordingUrl String?  @map("recording_url")
  transcript   String?
  createdAt    DateTime @default(now()) @map("created_at")

  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  order        Order?   @relation(fields: [orderId], references: [id])

  @@map("call_logs")
}
```

### 3.3 Migration Strategy

**Step-by-step migration:**

1. **Set up Prisma:**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

2. **Create data migration script:**
```typescript
// scripts/migrate-json-to-db.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';

const prisma = new PrismaClient();

async function migrate() {
  // Create default tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Matia's Kabab",
      slug: 'matias-kabab',
      phoneNumber: '(905) 388-9111'
    }
  });

  // Migrate menu
  const menuData = JSON.parse(await fs.readFile('menu.json', 'utf-8'));
  for (const category of menuData.categories) {
    for (const item of category.items) {
      await prisma.menuItem.create({
        data: {
          tenantId: tenant.id,
          name: item.name,
          description: item.description,
          price: item.price,
          category: category.name,
          available: item.available
        }
      });
    }
  }

  // Migrate orders
  const ordersData = JSON.parse(await fs.readFile('orders.json', 'utf-8'));
  for (const order of ordersData) {
    await prisma.order.create({
      data: {
        tenantId: tenant.id,
        customerName: order.customerName,
        customerPhone: order.phoneNumber || order.customerPhone,
        items: order.items,
        totalAmount: order.total || order.totalAmount,
        status: order.status || 'undealt',
        source: order.source || 'phone',
        createdAt: new Date(order.timestamp || order.createdAt)
      }
    });
  }

  console.log('Migration complete!');
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
```

3. **Update API routes to use Prisma:**
```typescript
// Before (menu.json)
const menuData = await fs.readFile(MENU_FILE, 'utf-8');
return NextResponse.json(JSON.parse(menuData));

// After (Prisma)
const tenantId = await getTenantId(request);
const menuItems = await prisma.menuItem.findMany({
  where: { tenantId },
  orderBy: { category: 'asc' }
});
return NextResponse.json(menuItems);
```

### 3.4 Implementation Checklist

- [ ] Install Prisma and dependencies
- [ ] Create Prisma schema
- [ ] Run initial migration
- [ ] Create migration script for existing data
- [ ] Update `/api/menu` to use Prisma
- [ ] Update `/api/orders` to use Prisma
- [ ] Update `/api/orders/update` to use Prisma
- [ ] Update `/api/openai-webhook` to use Prisma
- [ ] Remove old JSON file dependencies
- [ ] Add database connection pooling
- [ ] Test all CRUD operations

---

## 📋 Phase 4: Restaurant Onboarding (Weeks 7-8)

### 4.1 Registration Flow

**Landing Page** → **Signup Form** → **Email Verification** → **Onboarding Wizard** → **Dashboard**

#### Signup Form Fields:
```typescript
interface SignupData {
  restaurantName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  agreeToTerms: boolean;
}
```

#### Backend Flow:
```typescript
// app/api/signup/route.ts
export async function POST(request: Request) {
  const data: SignupData = await request.json();

  // 1. Validate data
  if (!isValidEmail(data.email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  // 2. Create tenant
  const slug = slugify(data.restaurantName);
  const tenant = await prisma.tenant.create({
    data: {
      name: data.restaurantName,
      slug,
      subscriptionTier: 'trial', // 14-day trial
      subscriptionStatus: 'trialing'
    }
  });

  // 3. Create owner user
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: data.email,
      phone: data.phone,
      name: data.ownerName,
      passwordHash,
      role: 'owner'
    }
  });

  // 4. Send verification email
  await sendVerificationEmail(user.email, tenant.slug);

  // 5. Create Stripe customer
  const customer = await stripe.customers.create({
    email: data.email,
    name: data.ownerName,
    metadata: { tenantId: tenant.id }
  });

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { stripeCustomerId: customer.id }
  });

  return NextResponse.json({
    success: true,
    tenantSlug: slug,
    redirectUrl: `https://${slug}.yourdomain.com/onboarding`
  });
}
```

### 4.2 Onboarding Wizard

**Step 1: Welcome**
- Brief intro video
- What to expect
- Estimated time: 5 minutes

**Step 2: Restaurant Details**
```typescript
- Restaurant name (editable)
- Cuisine type
- Address
- Business hours
- Upload logo
```

**Step 3: Menu Setup**
```typescript
Options:
1. Upload CSV/Excel file
2. Import from existing POS
3. Manual entry
4. Use sample menu (for testing)
```

**Step 4: Phone Number**
```typescript
- Select area code
- Choose from available numbers
- Or port existing number
- Configure greeting message
```

**Step 5: AI Configuration**
```typescript
- Choose AI voice (male/female)
- Set AI personality (friendly, professional, casual)
- Customize greeting
- Review default prompts
- Test call
```

**Step 6: Billing**
```typescript
- Select plan (skip if trial)
- Enter payment method
- Review pricing
```

**Step 7: Complete**
```typescript
- Show dashboard tour
- Quick action items
- Support resources
```

### 4.3 Admin Dashboard (Super Admin)

```
/admin
├── /dashboard         - Overview metrics
├── /tenants          - All restaurants
├── /users            - All users
├── /subscriptions    - Billing overview
├── /phone-numbers    - Number pool
├── /support          - Support tickets
└── /settings         - System config
```

**Key Features:**
- View all tenants
- Suspend/activate accounts
- View system health
- Manage phone number pool
- Handle support tickets
- View revenue metrics
- Export reports

---

## 📋 Phase 5: Phone Number Management (Weeks 9-10)

### 5.1 Twilio Integration

**Setup:**
```bash
npm install twilio
```

**Environment Variables:**
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER_SID=your_number_sid (for outbound)
```

### 5.2 Phone Number Provisioning

```typescript
// lib/twilio.ts
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function provisionPhoneNumber(
  tenantId: string,
  areaCode: string
): Promise<string> {
  // 1. Search for available numbers
  const availableNumbers = await client
    .availablePhoneNumbers('US')
    .local
    .list({ areaCode, limit: 10 });

  if (availableNumbers.length === 0) {
    throw new Error('No numbers available in this area code');
  }

  // 2. Purchase the first available number
  const phoneNumber = availableNumbers[0].phoneNumber;
  const purchasedNumber = await client.incomingPhoneNumbers.create({
    phoneNumber,
    voiceUrl: `https://yourdomain.com/api/twilio/voice/${tenantId}`,
    voiceMethod: 'POST',
    statusCallback: `https://yourdomain.com/api/twilio/status`,
    statusCallbackMethod: 'POST'
  });

  // 3. Save to database
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { phoneNumber }
  });

  return phoneNumber;
}

export async function releasePhoneNumber(phoneNumber: string) {
  // Find the number in Twilio
  const numbers = await client.incomingPhoneNumbers.list({
    phoneNumber
  });

  if (numbers.length > 0) {
    await client.incomingPhoneNumbers(numbers[0].sid).remove();
  }
}
```

### 5.3 Multi-Tenant Call Routing

**Update webhook to support multiple tenants:**

```typescript
// app/api/twilio/voice/[tenantId]/route.ts
export async function POST(
  request: Request,
  { params }: { params: { tenantId: string } }
) {
  const tenantId = params.tenantId;

  // 1. Get tenant info
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { menuItems: true }
  });

  if (!tenant) {
    return new Response('Tenant not found', { status: 404 });
  }

  // 2. Build menu context for AI
  const menuContext = buildMenuContext(tenant);

  // 3. Forward to OpenAI Realtime API
  const openAIResponse = await fetch(
    'https://api.openai.com/v1/realtime/sessions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'phone',
        phone: {
          number: tenant.phoneNumber
        },
        instructions: menuContext,
        tools: [
          {
            type: 'function',
            name: 'save_order',
            description: 'Save customer order',
            parameters: { /* ... */ }
          }
        ]
      })
    }
  );

  return openAIResponse;
}
```

### 5.4 Call Logging & Analytics

```typescript
// Save call metadata for analytics
await prisma.callLog.create({
  data: {
    tenantId,
    callSid: twilioCallSid,
    fromNumber: customerPhone,
    duration: callDuration,
    orderId: order?.id
  }
});
```

---

## 📋 Phase 6: Wallet & Pay-As-You-Go System (Weeks 11-12)

### 6.1 Pricing Strategy

**Pay-as-you-go model with prepaid wallet credits:**

```typescript
const pricing = {
  // Per-call pricing (deducted from wallet)
  callCosts: {
    // Based on OpenAI Realtime API pricing
    inputTextToken: 0.000004,      // $4 per 1M tokens (uncached)
    cachedTextToken: 0.0000004,    // $0.40 per 1M tokens (cached)
    inputAudioToken: 0.000032,     // $32 per 1M tokens (uncached)
    cachedAudioToken: 0.0000004,   // $0.40 per 1M tokens (cached)
    outputTextToken: 0.000016,     // $16 per 1M tokens
    outputAudioToken: 0.000064,    // $64 per 1M tokens
  },

  // Twilio costs
  twilioPerMinute: 0.02,          // $0.02 per minute
  twilioPerMonth: 1.00,           // $1/month per phone number

  // Minimum top-up amounts
  minTopUp: 10.00,                // $10 minimum
  suggestedTopUps: [10, 25, 50, 100, 250, 500],

  // New user bonus
  signupBonus: 5.00,              // $5 free credits for new users
};
```

### 6.2 Stripe Integration for Wallet Top-ups

**Setup:**
```bash
npm install stripe
```

**Implementation:**
```typescript
// lib/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

// Create a one-time payment for wallet top-up
export async function createTopUpPayment(
  tenantId: string,
  amount: number // in dollars
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  // Create or get Stripe customer
  let customerId = tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: tenant.email,
      name: tenant.name,
      metadata: { tenantId }
    });
    customerId = customer.id;

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customerId }
    });
  }

  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    customer: customerId,
    description: `Wallet top-up for ${tenant.name}`,
    metadata: {
      tenantId,
      type: 'wallet_top_up'
    }
  });

  return paymentIntent;
}

// Process successful payment and add credits to wallet
export async function processTopUp(
  tenantId: string,
  amount: number,
  paymentIntentId: string
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  const newBalance = (tenant.walletBalance || 0) + amount;

  // Update wallet balance
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { walletBalance: newBalance }
  });

  // Record transaction
  await prisma.walletTransaction.create({
    data: {
      tenantId,
      type: 'top_up',
      amount,
      balanceAfter: newBalance,
      description: `Wallet top-up via Stripe`,
      stripePaymentIntentId: paymentIntentId
    }
  });

  return newBalance;
}

// Deduct cost from wallet after each call
export async function deductCallCost(
  tenantId: string,
  callCost: number,
  callId: string
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (tenant.walletBalance < callCost) {
    throw new Error('Insufficient wallet balance');
  }

  const newBalance = tenant.walletBalance - callCost;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { walletBalance: newBalance }
  });

  await prisma.walletTransaction.create({
    data: {
      tenantId,
      type: 'call_charge',
      amount: -callCost,
      balanceAfter: newBalance,
      description: `AI call cost`,
      metadata: { callId }
    }
  });

  return newBalance;
}
```

### 6.3 Wallet UI Components

**Wallet Dashboard Page:**
```typescript
// app/wallet/page.tsx
'use client';

import { useState, useEffect } from 'react';

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [topUpAmount, setTopUpAmount] = useState(25);

  const suggestedAmounts = [10, 25, 50, 100, 250, 500];

  async function handleTopUp(amount: number) {
    const response = await fetch('/api/wallet/top-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });

    const { clientSecret } = await response.json();

    // Redirect to Stripe Checkout or use Stripe Elements
    // Implementation with Stripe checkout UI
  }

  return (
    <div className="p-8">
      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-xl p-8 text-white mb-8">
        <h2 className="text-lg opacity-90">Wallet Balance</h2>
        <div className="text-5xl font-bold mt-2">${balance.toFixed(2)}</div>
        <p className="mt-4 opacity-80">
          Credits are used for AI call processing and phone services
        </p>
      </div>

      {/* Top-up Section */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h3 className="text-xl font-bold mb-4">Add Credits</h3>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {suggestedAmounts.map(amount => (
            <button
              key={amount}
              onClick={() => setTopUpAmount(amount)}
              className={`p-4 rounded-lg border-2 transition ${
                topUpAmount === amount
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="text-2xl font-bold">${amount}</div>
            </button>
          ))}
        </div>

        <button
          onClick={() => handleTopUp(topUpAmount)}
          className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600"
        >
          Add ${topUpAmount} to Wallet
        </button>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-xl font-bold mb-4">Transaction History</h3>

        <div className="space-y-3">
          {transactions.map((tx: any) => (
            <div key={tx.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <div className="font-medium">{tx.description}</div>
                <div className="text-sm text-gray-500">{new Date(tx.createdAt).toLocaleString()}</div>
              </div>
              <div className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 6.3 Webhook Handlers

```typescript
// app/api/stripe/webhook/route.ts
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response('Webhook signature verification failed', {
      status: 400
    });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionCancellation(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSuccess(event.data.object);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
  }

  return new Response('Webhook processed', { status: 200 });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata.tenantId;

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    }
  });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { subscriptionStatus: subscription.status }
  });
}
```

### 6.4 Usage Limits & Enforcement

```typescript
// middleware/checkLimits.ts
export async function checkCallLimit(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { subscriptions: true }
  });

  const plan = pricingPlans[tenant.subscriptionTier];
  if (plan.limits.calls === -1) return true; // unlimited

  const currentPeriodCalls = await prisma.callLog.count({
    where: {
      tenantId,
      createdAt: {
        gte: tenant.subscriptions[0].currentPeriodStart
      }
    }
  });

  return currentPeriodCalls < plan.limits.calls;
}

// In API route
const canMakeCall = await checkCallLimit(tenantId);
if (!canMakeCall) {
  return NextResponse.json({
    error: 'Call limit reached. Upgrade your plan.'
  }, { status: 429 });
}
```

---

## 📋 Phase 7: Analytics & Reporting (Weeks 13-14)

### 7.1 Restaurant Analytics Dashboard

**Key Metrics:**
```typescript
interface RestaurantMetrics {
  // Today
  todayOrders: number;
  todayRevenue: number;
  todayCalls: number;

  // This Week
  weekOrders: number;
  weekRevenue: number;
  weekGrowth: number; // % vs last week

  // This Month
  monthOrders: number;
  monthRevenue: number;
  monthGrowth: number;

  // Popular Items
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;

  // Peak Times
  peakHours: Array<{
    hour: number;
    orderCount: number;
  }>;

  // Order Sources
  sources: {
    phone: number;
    web: number;
    app: number;
  };
}
```

**Analytics API:**
```typescript
// app/api/analytics/route.ts
export async function GET(request: Request) {
  const tenantId = await getTenantId(request);
  const { period } = new URL(request.url).searchParams;

  const startDate = getStartDate(period); // today, week, month, year

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      createdAt: { gte: startDate }
    }
  });

  const metrics = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
    avgOrderValue: orders.length > 0
      ? orders.reduce((sum, o) => sum + Number(o.totalAmount), 0) / orders.length
      : 0,

    // Popular items
    topItems: calculateTopItems(orders),

    // Peak times
    peakHours: calculatePeakHours(orders),

    // Source breakdown
    sources: {
      phone: orders.filter(o => o.source === 'phone').length,
      web: orders.filter(o => o.source === 'web').length,
      app: orders.filter(o => o.source === 'app').length
    }
  };

  return NextResponse.json(metrics);
}

function calculateTopItems(orders: Order[]) {
  const itemMap = new Map();

  orders.forEach(order => {
    (order.items as any[]).forEach(item => {
      const existing = itemMap.get(item.name) || { quantity: 0, revenue: 0 };
      itemMap.set(item.name, {
        name: item.name,
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + (item.price * item.quantity)
      });
    });
  });

  return Array.from(itemMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
}
```

### 7.2 Super Admin Analytics

**System-wide Metrics:**
```typescript
interface SystemMetrics {
  // Tenants
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  churnedTenants: number;

  // Revenue
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churnRate: number;

  // Usage
  totalCalls: number;
  totalOrders: number;
  avgCallsPerTenant: number;

  // Growth
  newTenantsThisMonth: number;
  growthRate: number;
}
```

### 7.3 Export Functionality

```typescript
// app/api/export/orders/route.ts
import { Parser } from 'json2csv';

export async function GET(request: Request) {
  const tenantId = await getTenantId(request);
  const { format, startDate, endDate } = new URL(request.url).searchParams;

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }
  });

  if (format === 'csv') {
    const parser = new Parser();
    const csv = parser.parse(orders);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=orders.csv'
      }
    });
  }

  // PDF export
  if (format === 'pdf') {
    const pdf = await generatePDFReport(orders);
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=orders.pdf'
      }
    });
  }

  return NextResponse.json(orders);
}
```

---

## 📋 Phase 8: Enhanced Features (Weeks 15-16)

### 8.1 Multi-Channel Integration

**Web Ordering Widget:**
```typescript
// Embeddable widget for restaurant websites
<script src="https://yourdomain.com/widget.js"></script>
<div id="ai-ordering-widget" data-restaurant="matias-kabab"></div>
```

**WhatsApp Integration:**
```typescript
// Using Twilio WhatsApp API
const message = await twilioClient.messages.create({
  from: 'whatsapp:+14155238886',
  to: `whatsapp:${customerPhone}`,
  body: 'Your order is ready for pickup!'
});
```

**SMS Ordering:**
```typescript
// Handle incoming SMS
app.post('/api/sms/incoming', async (req, res) => {
  const { From, Body } = req.body;
  const response = await processAIOrder(Body);

  res.type('text/xml');
  res.send(`
    <Response>
      <Message>${response}</Message>
    </Response>
  `);
});
```

### 8.2 Advanced AI Features

**Multi-language Support:**
```typescript
const aiInstructions = {
  en: 'You are a professional order-taking assistant...',
  es: 'Eres un asistente profesional de pedidos...',
  fr: 'Vous êtes un assistant professionnel de commande...'
};

// Detect language from customer input
const language = detectLanguage(customerInput);
const instructions = aiInstructions[language];
```

**Voice Customization:**
```typescript
// OpenAI Realtime API voice options
const voiceOptions = {
  alloy: 'Neutral, balanced voice',
  echo: 'Male, authoritative',
  fable: 'British accent',
  onyx: 'Deep male voice',
  nova: 'Friendly female',
  shimmer: 'Warm female'
};
```

**Sentiment Analysis:**
```typescript
// Analyze customer satisfaction from transcript
const sentiment = await analyzesentiment(transcript);
if (sentiment.score < 0.3) {
  // Alert restaurant owner about unhappy customer
  await notifyOwner(tenantId, {
    type: 'low_satisfaction',
    orderId,
    message: 'Customer seemed dissatisfied during call'
  });
}
```

### 8.3 Restaurant Operations

**Kitchen Display System (KDS):**
```typescript
// Real-time order updates to kitchen
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET
});

// When new order comes in
pusher.trigger(`kitchen-${tenantId}`, 'new-order', {
  orderId: order.id,
  items: order.items,
  customerName: order.customerName
});
```

**SMS Order Updates:**
```typescript
// Notify customer when order is ready
await twilioClient.messages.create({
  to: order.customerPhone,
  from: tenant.phoneNumber,
  body: `Hi ${order.customerName}! Your order is ready for pickup at ${tenant.name}. See you soon!`
});
```

**Delivery Integration:**
```typescript
// DoorDash Drive API integration
const delivery = await doordashClient.createDelivery({
  external_delivery_id: order.id,
  pickup_address: tenant.address,
  pickup_phone_number: tenant.phoneNumber,
  dropoff_address: order.deliveryAddress,
  dropoff_phone_number: order.customerPhone,
  order_value: order.totalAmount
});
```

---

## 📋 Phase 9: Security & Compliance (Ongoing)

### 9.1 Security Measures

**API Rate Limiting:**
```typescript
// middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

// Per-tenant rate limiting
export const tenantLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: async (req) => {
    const tenant = await getTenant(req);
    return tenant.subscriptionTier === 'enterprise' ? 1000 : 100;
  }
});
```

**Data Encryption:**
```typescript
// Encrypt sensitive data at rest
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// Encrypt customer phone numbers
await prisma.order.create({
  data: {
    customerPhone: encrypt(phoneNumber),
    // ...
  }
});
```

**SQL Injection Prevention:**
```typescript
// Prisma automatically prevents SQL injection
// But be careful with raw queries:

// BAD - vulnerable to SQL injection
const orders = await prisma.$queryRaw`
  SELECT * FROM orders WHERE customer_name = ${req.query.name}
`;

// GOOD - parameterized query
const orders = await prisma.$queryRaw`
  SELECT * FROM orders WHERE customer_name = ${Prisma.sql`${req.query.name}`}
`;

// BEST - use Prisma's type-safe queries
const orders = await prisma.order.findMany({
  where: { customerName: req.query.name }
});
```

### 9.2 Compliance

**GDPR Compliance:**
```typescript
// Right to erasure (delete all user data)
async function deleteUserData(userId: string) {
  await prisma.$transaction([
    prisma.order.deleteMany({ where: { userId } }),
    prisma.callLog.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } })
  ]);
}

// Data export (right to data portability)
async function exportUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      orders: true,
      callLogs: true
    }
  });

  return JSON.stringify(user, null, 2);
}
```

**PCI Compliance:**
- Never store credit card numbers
- Use Stripe for all payment processing
- Stripe handles PCI compliance
- Only store Stripe customer IDs and payment method IDs

**Terms of Service & Privacy Policy:**
- [ ] Create Terms of Service
- [ ] Create Privacy Policy
- [ ] Add cookie consent banner
- [ ] Implement data retention policy
- [ ] Create data processing agreement (DPA)

### 9.3 Backup & Disaster Recovery

**Automated Backups:**
```bash
# Daily database backup script
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y-%m-%d)"
mkdir -p $BACKUP_DIR

pg_dump $DATABASE_URL > $BACKUP_DIR/backup.sql
tar -czf $BACKUP_DIR/backup.tar.gz $BACKUP_DIR/backup.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/backup.tar.gz s3://your-backup-bucket/
```

**Disaster Recovery Plan:**
1. Database backups every 6 hours
2. Point-in-time recovery up to 7 days
3. Multi-region replication (production)
4. Automated failover
5. Recovery time objective (RTO): 1 hour
6. Recovery point objective (RPO): 6 hours

---

## 📋 Phase 10: Production Deployment (Week 17)

### 10.1 Infrastructure Setup

**Recommended Architecture:**
```
Users → Cloudflare (CDN/DDoS)
      → Vercel/Railway (Next.js App)
      → Supabase/Neon (PostgreSQL)
      → OpenAI API
      → Twilio API
      → Stripe API
```

**Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://app.yourdomain.com

# OpenAI
OPENAI_API_KEY=sk-...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SendGrid)
SENDGRID_API_KEY=SG...

# Monitoring
SENTRY_DSN=https://...
```

### 10.2 CI/CD Pipeline

**GitHub Actions Workflow:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 10.3 Monitoring & Alerts

**Sentry for Error Tracking:**
```typescript
// app/layout.tsx
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV
});
```

**Uptime Monitoring:**
- UptimeRobot (free tier)
- Check endpoints every 5 minutes
- Alert via email, SMS, Slack if down

**Performance Monitoring:**
```typescript
// lib/analytics.ts
export function trackMetric(name: string, value: number) {
  if (process.env.NODE_ENV === 'production') {
    // Send to Datadog, New Relic, or custom analytics
    fetch('https://api.datadoghq.com/api/v1/series', {
      method: 'POST',
      headers: {
        'DD-API-KEY': process.env.DATADOG_API_KEY!
      },
      body: JSON.stringify({
        series: [{
          metric: name,
          points: [[Date.now() / 1000, value]]
        }]
      })
    });
  }
}

// Track API response times
trackMetric('api.orders.response_time', responseTime);
```

---

## 🎯 Team Collaboration Strategy

### Developer 1 (Backend/Infrastructure Focus)
**Weeks 1-8:**
- [ ] Database schema design
- [ ] Prisma setup & migration
- [ ] Multi-tenant architecture
- [ ] Authentication with NextAuth
- [ ] API security & rate limiting
- [ ] Twilio phone integration
- [ ] Stripe billing integration

**Weeks 9-16:**
- [ ] Analytics API endpoints
- [ ] Admin dashboard backend
- [ ] Call logging & tracking
- [ ] Usage limits enforcement
- [ ] Backup automation
- [ ] Performance optimization

### Developer 2 (Frontend/UX Focus)
**Weeks 1-8:**
- [ ] UI component library
- [ ] Onboarding wizard
- [ ] Restaurant dashboard redesign
- [ ] Menu management UI
- [ ] Order management improvements
- [ ] Settings page enhancements
- [ ] Mobile responsiveness

**Weeks 9-16:**
- [ ] Analytics dashboard UI
- [ ] Admin portal UI
- [ ] Billing/subscription pages
- [ ] Email templates
- [ ] Documentation site
- [ ] Marketing landing page

### Shared Responsibilities
- Daily standups (15 min)
- Weekly sprint planning
- Code reviews (all PRs)
- Documentation updates
- Testing (unit + integration)
- Bug fixes
- Customer support (rotating)

---

## 💰 Financial Projections

### Costs (Monthly)

**Infrastructure:**
- Vercel/Railway: $50
- Supabase: $25
- Cloudflare: $20
- SendGrid: $15
- Monitoring: $30
**Total Fixed: ~$140/month**

**Variable Costs:**
- OpenAI API: $1 per call
- Twilio: $1/month per number + $0.02/minute
- Stripe: 2.9% + $0.30 per transaction

### Revenue Model

**Year 1 (Aggressive Growth):**
```
Month 1:   5 restaurants × $49  = $245
Month 3:  15 restaurants × $49  = $735
Month 6:  40 restaurants × $49  = $1,960
Month 12: 100 restaurants        = $7,000/month

Average: 40% Starter ($49), 50% Professional ($149), 10% Enterprise ($500)
Month 12 MRR: ~$10,000
```

**Break-even Analysis:**
- Break-even: ~20 restaurants (month 3-4)
- Profitability: Month 5+
- Target: 100 restaurants by month 12

### Funding Needs
**Option 1: Bootstrap** ($0 investment)
- Grow organically
- Reinvest profits
- Slower growth (1-2 years to 100 customers)

**Option 2: Seed Round** ($50K-100K)
- Marketing budget
- Sales team
- Faster development
- Faster growth (6-12 months to 100 customers)

---

## 📚 Documentation Plan

### Technical Documentation
- [ ] API documentation (Swagger)
- [ ] Database schema diagrams
- [ ] Architecture diagrams
- [ ] Deployment guide
- [ ] Local development setup
- [ ] Troubleshooting guide

### User Documentation
- [ ] Getting started guide
- [ ] Menu upload guide
- [ ] Phone setup guide
- [ ] AI customization guide
- [ ] Analytics guide
- [ ] FAQ
- [ ] Video tutorials

### Business Documentation
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] SLA (Service Level Agreement)
- [ ] Data Processing Agreement
- [ ] Acceptable Use Policy

---

## 🚀 Launch Checklist

### Pre-Launch (Weeks 16-17)
- [ ] Security audit completed
- [ ] Load testing completed (1000 concurrent users)
- [ ] All documentation complete
- [ ] Legal documents reviewed
- [ ] Beta testing with 5 restaurants
- [ ] Feedback incorporated
- [ ] Marketing materials ready
- [ ] Support system in place

### Launch Day
- [ ] Deploy to production
- [ ] DNS configured
- [ ] SSL certificates active
- [ ] Monitoring active
- [ ] Support team ready
- [ ] Announcement emails sent
- [ ] Social media posts
- [ ] Press release (optional)

### Post-Launch (Week 18+)
- [ ] Monitor error rates
- [ ] Track key metrics
- [ ] Gather customer feedback
- [ ] Weekly feature releases
- [ ] Monthly retrospectives
- [ ] Scale infrastructure as needed

---

## 📊 Success Metrics

### Product Metrics
- **MAU** (Monthly Active Users): Target 100 restaurants by month 12
- **Retention Rate**: Target 85%+ monthly retention
- **NPS** (Net Promoter Score): Target 50+
- **Churn Rate**: Target <5% monthly

### Technical Metrics
- **Uptime**: 99.9% SLA
- **API Response Time**: <200ms p95
- **Error Rate**: <0.1%
- **Call Success Rate**: >95%

### Business Metrics
- **MRR Growth**: 20% month-over-month
- **CAC** (Customer Acquisition Cost): <$200
- **LTV** (Lifetime Value): >$2,000
- **LTV:CAC Ratio**: >10:1

---

## 🎯 Next Immediate Actions

### This Week (Week 1)
1. **Make Key Decisions:**
   - [ ] Choose hosting provider (Vercel recommended)
   - [ ] Choose database (Supabase recommended)
   - [ ] Finalize pricing model
   - [ ] Define MVP feature set

2. **Setup Foundation:**
   - [ ] Create Supabase project
   - [ ] Install Prisma: `npm install @prisma/client prisma`
   - [ ] Design initial database schema
   - [ ] Create tenant migration plan

3. **Start Development:**
   - [ ] Create feature branch: `git checkout -b feature/multi-tenant`
   - [ ] Implement Prisma schema
   - [ ] Create tenant middleware
   - [ ] Update one API route as POC (orders)

### Next Week (Week 2)
1. **Continue Database Migration:**
   - [ ] Migrate menu API routes
   - [ ] Migrate webhook route
   - [ ] Test multi-tenant isolation
   - [ ] Create seed data for testing

2. **Authentication Setup:**
   - [ ] Install NextAuth: `npm install next-auth@beta`
   - [ ] Configure providers
   - [ ] Create signup flow
   - [ ] Test authentication

---

## 📞 Questions to Answer

Before starting, discuss and decide:

1. **Business Model:**
   - Fixed pricing or usage-based?
   - Free trial period (14 days recommended)?
   - Support SLA commitments?

2. **Technical Choices:**
   - PostgreSQL or MongoDB?
   - Vercel or Railway for hosting?
   - Self-hosted auth or Clerk/Auth0?

3. **Features:**
   - Which features for MVP?
   - Which features for v2.0?
   - Mobile app priority?

4. **Operations:**
   - 24/7 support or business hours?
   - How to handle support tickets?
   - Onboarding: white-glove or self-service?

---

## 🤝 Support & Resources

**Development Resources:**
- Next.js Docs: https://nextjs.org/docs
- Prisma Docs: https://www.prisma.io/docs
- Stripe Docs: https://stripe.com/docs
- Twilio Docs: https://www.twilio.com/docs
- OpenAI Docs: https://platform.openai.com/docs

**Community:**
- Next.js Discord
- Indie Hackers (for SaaS advice)
- r/SaaS subreddit

**Need Help?**
Feel free to ask questions about:
- Technical implementation
- Architecture decisions
- Scaling strategies
- Business model advice

---

**Ready to build the future of restaurant ordering! 🚀**

Let's start with Phase 1 - which area would you like to tackle first?