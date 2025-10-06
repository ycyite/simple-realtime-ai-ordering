import { MenuItem, Order, RestaurantSettings } from '@/types';

export const mockMenu: MenuItem[] = [
  {
    id: '1',
    name: 'Classic Burger',
    description: 'Beef patty with lettuce, tomato, and special sauce',
    price: 12.99,
    category: 'Burgers',
    available: true,
  },
  {
    id: '2',
    name: 'Margherita Pizza',
    description: 'Fresh mozzarella, tomato sauce, and basil',
    price: 14.99,
    category: 'Pizza',
    available: true,
  },
  {
    id: '3',
    name: 'Caesar Salad',
    description: 'Romaine lettuce, croutons, parmesan, Caesar dressing',
    price: 9.99,
    category: 'Salads',
    available: true,
  },
  {
    id: '4',
    name: 'French Fries',
    description: 'Crispy golden fries with sea salt',
    price: 4.99,
    category: 'Sides',
    available: true,
  },
  {
    id: '5',
    name: 'Chocolate Shake',
    description: 'Rich chocolate milkshake topped with whipped cream',
    price: 6.99,
    category: 'Beverages',
    available: true,
  },
];

export const mockOrders: Order[] = [
  {
    id: '001',
    customerName: 'Matthew',
    customerPhone: '+1234567890',
    items: [
      { menuItemId: '1', name: 'Classic Burger', quantity: 2, price: 12.99 },
      { menuItemId: '4', name: 'French Fries', quantity: 1, price: 4.99 },
    ],
    totalAmount: 30.97,
    status: 'undealt',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
    notes: 'No onions please',
  },
  {
    id: '002',
    customerName: 'Eric',
    customerPhone: '+1234567891',
    items: [
      { menuItemId: '2', name: 'Margherita Pizza', quantity: 1, price: 14.99 },
      { menuItemId: '5', name: 'Chocolate Shake', quantity: 2, price: 6.99 },
    ],
    totalAmount: 28.97,
    status: 'preparing',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(), // 15 minutes ago
  },
  {
    id: '003',
    customerName: 'Sarah',
    customerPhone: '+1234567892',
    items: [
      { menuItemId: '3', name: 'Caesar Salad', quantity: 1, price: 9.99 },
    ],
    totalAmount: 9.99,
    status: 'completed',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(), // 1 hour ago
  },
];

export const mockSettings: RestaurantSettings = {
  id: '1',
  name: "Joe's Diner",
  phone: '+1234567890',
  address: '123 Main Street, Anytown, USA',
  aiPrompt: 'You are a friendly restaurant order-taking assistant. Be polite, confirm orders clearly, and ask about customizations.',
  welcomeMessage: 'Thank you for calling Joe\'s Diner! How can I help you today?',
};
