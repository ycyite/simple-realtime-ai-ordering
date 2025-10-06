# Frontend Setup

This Next.js frontend connects to the Express backend for the AI Voice Ordering System.

## Prerequisites

- Node.js 18+
- The Express backend running on port 3000

## Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Running

1. Make sure the Express backend is running on port 3000:
```bash
# In the root directory
npm start
```

2. In a separate terminal, start the Next.js frontend:
```bash
# In the frontend directory
npm run dev
```

3. Open http://localhost:3001 in your browser

## Architecture

- **Frontend**: Next.js on port 3001
- **Backend**: Express on port 3000
- **API Proxy**: Next.js proxies `/api/*` requests to the Express backend

## Available Pages

- `/` - Home page
- `/menu` - Menu management
- `/orders` - Order management with status workflow
- `/settings` - Restaurant settings

## API Integration

The frontend connects to these backend endpoints:

- `GET /api/menu` - Get menu data
- `POST /api/menu` - Update menu
- `GET /api/orders` - Get orders
- `POST /api/orders/update` - Update order status
- `GET /api/health` - Health check

## Development

- Frontend runs on port 3001
- Backend runs on port 3000
- All API calls are proxied through Next.js rewrites
