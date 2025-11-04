# Counter Bell - AI Restaurant Ordering System

An AI-powered phone ordering system for restaurants using OpenAI's Realtime API. Counter Bell enables restaurants to accept phone orders through an intelligent voice agent, manage orders in real-time, and track usage costs.

## Features

- **AI Phone Agent** - Customers call and place orders via voice using OpenAI's Realtime API
- **Real-time Order Management** - Dashboard for viewing and managing incoming orders
- **Menu Management** - Create, update, and delete menu items with pricing
- **Multi-tenant Support** - Multiple restaurants can use the system independently
- **Staff Management** - Invite codes for team members to access the dashboard
- **Wallet System** - Credit-based billing with Stripe integration
- **Restaurant Settings** - Configure restaurant details, phone numbers, and AI behavior
- **Open/Closed Status** - Toggle to control when the AI accepts orders

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Authentication**: Clerk
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI Realtime API
- **Payments**: Stripe
- **SMS Notifications**: Twilio (optional)
- **Deployment**: Railway / Vercel

## Prerequisites

Before deploying, ensure you have:

- Node.js 18 or higher
- A PostgreSQL database (Supabase, Railway, or any PostgreSQL provider)
- Clerk account for authentication
- OpenAI API key with Realtime API access
- Stripe account for payments (optional but recommended)
- Twilio account for SMS notifications (optional)

## Environment Variables

Create a `.env.local` file (for local development) or set these environment variables in your deployment platform:

### Required Variables

```bash
# Clerk Authentication
# Get keys from: https://dashboard.clerk.com/last-active?path=api-keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_or_pk_live_...
CLERK_SECRET_KEY=sk_test_or_sk_live_...

# Clerk Redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/restaurants
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/restaurants
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/restaurants
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/restaurants

# Clerk Webhook Secret (for multi-tenant setup)
# Create a webhook at: https://dashboard.clerk.com/last-active?path=webhooks
# Point it to: https://your-domain.com/api/webhooks/clerk
# Subscribe to: user.created event
CLERK_WEBHOOK_SECRET=whsec_...

# Database (PostgreSQL)
# Format: postgresql://username:password@host:port/database
# Supabase: https://app.supabase.com/project/_/settings/database
# Railway: Copy from Railway dashboard
DATABASE_URL=postgresql://postgres:password@host:5432/database

# OpenAI API Key
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-...
```

### Optional Variables

```bash
# Twilio Configuration (for SMS notifications)
# Get from: https://console.twilio.com/
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Stripe Configuration (for payments)
# Get from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_or_sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Deployment Instructions

### Option 1: Deploy to Railway

1. **Create a Railway account** at [railway.app](https://railway.app)

2. **Create a new project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account and select this repository

3. **Add PostgreSQL database**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically provision a database and set `DATABASE_URL`

4. **Set environment variables**
   - Go to your project → Variables
   - Add all required environment variables listed above
   - Railway automatically sets `PORT` variable

5. **Configure build settings**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Railway will detect these from package.json automatically

6. **Deploy**
   - Railway will automatically deploy on every push to main branch
   - Get your deployment URL from the Railway dashboard

7. **Set up Clerk webhook**
   - Copy your Railway deployment URL
   - Go to Clerk dashboard → Webhooks
   - Add endpoint: `https://your-railway-url.up.railway.app/api/webhooks/clerk`
   - Subscribe to `user.created` event
   - Copy the signing secret and add it as `CLERK_WEBHOOK_SECRET`

8. **Run database migrations**
   - In Railway dashboard, open the Shell
   - Run: `npx prisma db push`

### Option 2: Deploy to Vercel

1. **Create a Vercel account** at [vercel.com](https://vercel.com)

2. **Import your repository**
   - Click "New Project"
   - Import from GitHub
   - Select this repository

3. **Set up database**
   - Use Vercel Postgres, Supabase, or any PostgreSQL provider
   - Copy the connection string

4. **Configure environment variables**
   - In project settings → Environment Variables
   - Add all required variables from the list above

5. **Deploy**
   - Vercel will automatically build and deploy
   - Get your deployment URL: `https://your-project.vercel.app`

6. **Set up Clerk webhook**
   - Go to Clerk dashboard → Webhooks
   - Add endpoint: `https://your-project.vercel.app/api/webhooks/clerk`
   - Subscribe to `user.created` event
   - Add the signing secret as `CLERK_WEBHOOK_SECRET`

7. **Run database migrations**
   - Install Vercel CLI: `npm i -g vercel`
   - Login: `vercel login`
   - Link project: `vercel link`
   - Run migration: `vercel env pull .env.local && npx prisma db push`

### Option 3: Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/simple-realtime-ai-ordering.git
   cd simple-realtime-ai-ordering
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up database**
   - Create a PostgreSQL database (local or cloud)
   - Copy the connection string

4. **Configure environment variables**
   - Copy `.env.example` to `.env.local`
   - Fill in all required variables

5. **Run database migrations**
   ```bash
   npx prisma db push
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open browser**
   - Navigate to [http://localhost:3000](http://localhost:3000)

## Database Setup

The application uses Prisma ORM. After setting the `DATABASE_URL`:

1. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

2. **Push schema to database**
   ```bash
   npx prisma db push
   ```

3. **View database (optional)**
   ```bash
   npx prisma studio
   ```

## Post-Deployment Configuration

### 1. Configure Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Enable email/password authentication
3. Customize sign-in/sign-up pages (optional)
4. Set up webhook as described in deployment steps

### 2. Configure OpenAI Realtime API

1. Ensure you have access to the Realtime API
2. The API endpoint will be: `/api/openai-webhook`
3. OpenAI will call this endpoint during voice calls

### 3. Configure Stripe (Optional)

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get API keys from dashboard
3. Set up webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
4. Subscribe to payment events

### 4. Configure Twilio (Optional)

1. Create account at [twilio.com](https://twilio.com)
2. Get phone number
3. Configure webhook for incoming calls to point to your OpenAI endpoint

## Application Pages

- `/sign-in` - User sign in
- `/sign-up` - User registration
- `/restaurants` - Restaurant selection/creation
- `/orders` - Order management dashboard
- `/menu` - Menu item management
- `/settings` - Restaurant settings and configuration
- `/staff` - Staff management
- `/staff/invites` - Generate invite codes
- `/billing` - Wallet and billing management

## Troubleshooting

### Database connection issues
- Verify `DATABASE_URL` is correctly formatted
- Check if database accepts connections from your deployment IP
- For Supabase: Enable "Use connection pooling" and use the pooling URL

### Clerk authentication not working
- Verify all Clerk environment variables are set
- Check that redirect URLs match your deployment URL
- Ensure webhook is properly configured

### OpenAI API errors
- Verify API key has Realtime API access
- Check OpenAI account has sufficient credits
- Monitor rate limits

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
