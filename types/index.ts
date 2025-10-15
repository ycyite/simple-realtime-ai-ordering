export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  customizations?: string;
}

export interface Order {
  id: string;
  customerName?: string;
  customerPhone: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'undealt' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  createdAt: string;
  pickupTime?: string;
  notes?: string;
}

export interface RestaurantSettings {
  id: string;
  name: string;
  phone: string;
  address: string;
  aiPhone?: string;
}
