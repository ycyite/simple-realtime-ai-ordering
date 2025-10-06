# Quick Start Guide

## Run the Demo

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## What You'll See

### Orders Page (Default)
- 3 sample orders (1 undealt, 1 preparing, 1 completed)
- New orders auto-generate every ~10 seconds
- Alert banner shows when undealt orders exist
- Click "Accept" to move orders to "Preparing"
- Click "Complete" to finish orders

### Menu Page
- 5 sample menu items across categories
- Click "Add Item" to create new menu items
- Edit or delete existing items
- Toggle availability on/off

### Settings Page
- View restaurant information
- Click "Edit Settings" to modify:
  - Restaurant name, phone, address
  - AI welcome message
  - AI prompt instructions

## Features to Try

✅ **Alert System**: Keep the page open and wait for a new order to trigger the alert
✅ **Order Filtering**: Click "Undealt", "Preparing", "Completed" to filter
✅ **Menu CRUD**: Add, edit, delete, and toggle menu items
✅ **Settings**: Customize AI behavior and restaurant info

## Next: Connect to Backend

Currently using mock data. To connect real backend:

1. Create `lib/api.ts` with fetch functions
2. Replace mock data with API calls
3. Add WebSocket for real-time order updates
4. Map restaurant ID from settings to backend

See `README.md` for detailed integration steps.
