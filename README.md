# 🔔 Counter Bell - AI Restaurant Ordering System

An AI-powered phone ordering system for restaurants using OpenAI's Realtime API.

## 🚀 Features

- **AI Phone Agent** - Customers call and place orders via voice
- **Real-time Order Management** - Dashboard for managing incoming orders
- **Menu Management** - Easy menu item CRUD operations
- **Restaurant Settings** - Configure restaurant info and AI behavior
- **Call Analytics** - Track token usage and call costs
- **Restaurant Open/Closed Toggle** - Control when to accept calls

## 🛠️ Tech Stack

- **Frontend & Backend**: Next.js 15 (App Router)
- **Authentication**: Clerk
- **Database**: Supabase (PostgreSQL) - planned
- **AI**: OpenAI Realtime API
- **Payments**: Stripe (wallet system) - planned
- **Hosting**: Railway

## 📋 Getting Started

### Prerequisites

- Node.js 18+
- Clerk account ([clerk.com](https://clerk.com))
- OpenAI API key ([platform.openai.com](https://platform.openai.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd AI_Audio_Ordering_System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env.local` and fill in:
   ```bash
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...

   # OpenAI API
   OPENAI_API_KEY=sk-proj-...
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Pages

- `/signin` - Sign in page
- `/register` - Registration page
- `/orders` - Orders dashboard (default)
- `/menu` - Menu management
- `/settings` - Restaurant settings

## 🗺️ Roadmap

See [plan.md](./plan.md) for the full SaaS platform roadmap including:
- Multi-tenant architecture
- Wallet/credit system
- Supabase database integration
- Phone number provisioning (Twilio)
- Advanced analytics

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue first to discuss what you would like to change.
