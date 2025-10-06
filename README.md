# Restaurant Management Portal - Frontend

A Next.js-based management portal for the AI-powered restaurant ordering system.

## Features

### 📋 Orders Dashboard
- View all orders with filtering (All, Undealt, Preparing, Completed)
- Real-time order notifications with audio alerts
- Accept, cancel, or complete orders
- View order details including items, customer info, and notes
- Auto-simulation of incoming orders for demo purposes

### 🍔 Menu Management
- Full CRUD operations for menu items
- Organize items by category
- Toggle item availability
- Price and description management
- Easy category-based organization

### ⚙️ Restaurant Settings
- Configure restaurant basic information (name, phone, address)
- Customize AI welcome message
- Edit AI prompt/instructions for call handling
- View integration ID for backend linking

### 🔔 Alert System
- Continuous audio alerts for undealt orders
- Visual notification banner
- Manual alert dismissal

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - automatically redirects to `/orders`.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home (redirects to /orders)
│   ├── orders/
│   │   └── page.tsx        # Orders dashboard
│   ├── menu/
│   │   └── page.tsx        # Menu management
│   └── settings/
│       └── page.tsx        # Restaurant settings
├── components/
│   ├── Navigation.tsx      # Main navigation bar
│   └── AlertBanner.tsx     # Undealt orders alert
├── hooks/
│   └── useOrderAlert.ts    # Audio alert logic
├── lib/
│   └── mockData.ts         # Mock data for demo
├── types/
│   └── index.ts            # TypeScript interfaces
└── public/
    └── alert.mp3           # Alert sound (placeholder)
```

## Mock Data & Demo Mode

The app currently runs with mock data for demonstration:

- **Mock Orders**: 3 initial orders with different statuses
- **Mock Menu**: 5 sample menu items across categories
- **Auto-simulation**: New orders appear every 10 seconds (30% chance)

## Connecting to Backend

To connect to a real backend API, replace the mock data imports with API calls:

1. Create an API client in `lib/api.ts`
2. Replace `useState(mockOrders)` with data fetching hooks
3. Implement WebSocket or polling for real-time order updates
4. Update CRUD operations to call backend endpoints

Example API endpoints you'll need:
- `GET /api/orders` - Fetch orders
- `POST /api/orders/:id/status` - Update order status
- `GET /api/menu` - Fetch menu items
- `POST /api/menu` - Add menu item
- `PUT /api/menu/:id` - Update menu item
- `DELETE /api/menu/:id` - Delete menu item
- `GET /api/settings` - Fetch restaurant settings
- `PUT /api/settings` - Update settings

## Audio Alert

The audio alert requires a real MP3 file at `public/alert.mp3`. Currently it's a placeholder text file.

You can:
1. Download a free alert sound from [freesound.org](https://freesound.org)
2. Replace `public/alert.mp3` with the actual audio file
3. Or use browser's notification API instead

## Next Steps

- [ ] Add authentication/login system
- [ ] Connect to real backend API
- [ ] Implement WebSocket for real-time updates
- [ ] Add multi-restaurant support (tenant selection)
- [ ] Add order analytics/statistics
- [ ] Add export functionality for orders
- [ ] Implement phone number management
- [ ] Add user management for restaurant staff

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState, useEffect)
- **Routing**: Next.js App Router

## License

MIT
