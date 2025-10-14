'use client';
import { apiFetch } from '@/lib/api-client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AlertBanner from '@/components/AlertBanner';
import { Order } from '@/types';
import { useOrderAlert } from '@/hooks/useOrderAlert';

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersContent />
    </ProtectedRoute>
  );
}

type TabType = 'undealt' | 'preparing' | 'completed';

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('undealt');
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to format pickup time
  const formatPickupTime = (pickupTime?: string, createdAt?: string) => {
    if (!pickupTime) {
      // Fallback to createdAt if pickupTime is not available
      if (!createdAt) return 'N/A';
      const date = new Date(createdAt);
      return date.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
      });
    }

    // Check if pickupTime is a relative time like "20 minutes", "1 hour", etc.
    const relativeTimeMatch = pickupTime.match(/(\d+)\s*(minute|hour|min|hr)/i);
    if (relativeTimeMatch) {
      const amount = parseInt(relativeTimeMatch[1]);
      const unit = relativeTimeMatch[2].toLowerCase();
      const minutes = unit.startsWith('hour') || unit === 'hr' ? amount * 60 : amount;

      // Calculate pickup time from createdAt
      const orderDate = createdAt ? new Date(createdAt) : new Date();
      const pickupDate = new Date(orderDate.getTime() + minutes * 60 * 1000);

      return pickupDate.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
      });
    }

    // Try to parse as a date/time string
    try {
      const date = new Date(pickupTime);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          month: '2-digit',
          day: '2-digit',
          year: '2-digit'
        });
      }
    } catch (e) {
      // If parsing fails, return the original string
    }

    // Return as-is if it's already a formatted string
    return pickupTime;
  };

  // Check if user has selected a restaurant, if not redirect to restaurants page
  useEffect(() => {
    const restaurantId = localStorage.getItem('activeRestaurantId');
    if (!restaurantId) {
      window.location.href = '/restaurants';
      return;
    }
  }, []);

  // Load orders from API on mount
  useEffect(() => {
    apiFetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        // Convert API data to Order type
        const formattedOrders: Order[] = (data || []).map((order: any) => ({
          id: order.id,
          customerName: order.customerName,
          customerPhone: order.phoneNumber || order.customerPhone || '',
          items: order.items || [],
          totalAmount: order.total || order.totalAmount || 0,
          status: order.status || 'undealt',
          createdAt: order.timestamp || order.createdAt || new Date().toISOString(),
          pickupTime: order.pickupTime,
          notes: order.notes || '',
        }));
        setOrders(formattedOrders);
      })
      .catch(err => console.error('Failed to load orders:', err));
  }, []);

  const { dismissAlert, playbackError } = useOrderAlert(orders);

  // Poll for new orders every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      apiFetch('/api/orders')
        .then(res => res.json())
        .then(data => {
          const formattedOrders: Order[] = (data || []).map((order: any) => ({
            id: order.id,
            customerName: order.customerName,
            customerPhone: order.phoneNumber || order.customerPhone || '',
            items: order.items || [],
            totalAmount: order.total || order.totalAmount || 0,
            status: order.status || 'undealt',
            createdAt: order.timestamp || order.createdAt || new Date().toISOString(),
            pickupTime: order.pickupTime,
            notes: order.notes || '',
          }));
          setOrders(formattedOrders);
        })
        .catch(err => console.error('Failed to refresh orders:', err));
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Reset search when switching tabs
  useEffect(() => {
    setSearchTerm('');
  }, [activeTab]);

  const undealtCount = orders.filter((o) => o.status === 'undealt').length;

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    // Update local state
    const updatedOrders = orders.map((order) =>
      order.id === orderId ? { ...order, status } : order
    );
    setOrders(updatedOrders);

    // Save to backend
    apiFetch('/api/orders/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedOrders),
    }).catch(err => console.error('Failed to update order status:', err));
  };

  const filterOrders = (ordersList: Order[], searchTerm: string) => {
    if (!searchTerm.trim()) return ordersList;

    const search = searchTerm.toLowerCase();
    return ordersList.filter((order) => {
      const customerName = order.customerName?.toLowerCase() || '';
      const customerPhone = order.customerPhone.toLowerCase();
      const orderItems = order.items.map(item => item.name.toLowerCase()).join(' ');

      return customerName.includes(search) ||
             customerPhone.includes(search) ||
             orderItems.includes(search);
    });
  };

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const todayOrders = orders.filter(o => {
    const today = new Date().toDateString();
    const orderDate = new Date(o.createdAt).toDateString();
    return today === orderDate;
  }).length;

  const undealtOrders = orders.filter(o => o.status === 'undealt');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const completedOrders = orders.filter(o => o.status === 'completed');

  const getTabOrders = () => {
    let tabOrders: Order[];
    switch (activeTab) {
      case 'undealt':
        tabOrders = filterOrders(undealtOrders, searchTerm);
        break;
      case 'preparing':
        tabOrders = filterOrders(preparingOrders, searchTerm);
        // Sort preparing orders as FIFO queue (oldest first)
        tabOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'completed':
        tabOrders = filterOrders(completedOrders, searchTerm);
        // Sort completed orders by most recent first
        tabOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        tabOrders = [];
    }
    return tabOrders;
  };

  const getTabConfig = (tab: TabType) => {
    switch (tab) {
      case 'undealt':
        return {
          icon: '/icons/undealt.png',
          label: 'New Orders',
          count: undealtOrders.length,
          borderColor: '#FFB975',
          emptyMessage: 'No pending orders'
        };
      case 'preparing':
        return {
          icon: '/icons/dealing.png',
          label: 'In Progress',
          count: preparingOrders.length,
          borderColor: '#4C7A62',
          emptyMessage: 'No orders in progress'
        };
      case 'completed':
        return {
          icon: '/icons/check-mark.png',
          label: 'Completed',
          count: completedOrders.length,
          borderColor: '#4C7A62',
          emptyMessage: 'No completed orders'
        };
    }
  };

  const renderOrderCard = (order: Order) => {
    const isCompleted = order.status === 'completed';
    const isUndealt = order.status === 'undealt';
    const isPreparing = order.status === 'preparing';

    // Check if this is an error/callback order
    const isErrorOrder = order.customerName?.includes('PARSING ERROR');

    const borderColor = isErrorOrder ? '#DC2626' : (isUndealt ? '#FFB975' : '#4C7A62');
    const pickupTimeColor = isCompleted ? '#4C7A62' : '#FFB975';

    return (
      <div
        key={order.id}
        className={`glass-white p-4 hover:shadow-xl transition-all duration-300 border-l-4 rounded-xl ${isCompleted ? 'opacity-80' : ''} ${isErrorOrder ? 'animate-pulse' : ''}`}
        style={{ borderLeftColor: borderColor }}
      >
        {/* Error Alert Banner for callback orders */}
        {isErrorOrder && (
          <div className="mb-4 p-3 rounded-lg border-2 border-red-600 bg-red-50 animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🚨</span>
              <p className="text-lg font-bold text-red-700">URGENT: CALL CUSTOMER BACK!</p>
            </div>
            <p className="text-sm text-red-600 font-semibold">
              System error occurred during order. Please call the customer immediately to take their order.
            </p>
          </div>
        )}

        {/* Customer Name */}
        <div className="mb-3">
          <p className={`text-lg font-bold flex items-center gap-2 ${isErrorOrder ? 'text-red-700' : 'text-gray-900'}`}>
            <img src="/icons/user.png" alt="" className="w-6 h-6" />
            {isErrorOrder ? '⚠️ SYSTEM ERROR - CALLBACK NEEDED' : (order.customerName || `Customer ${order.customerPhone.slice(-4)}`)}
          </p>
        </div>

        {/* Pickup Time */}
        <div className="mb-3 flex items-center gap-2 text-sm text-gray-700">
          <img src="/icons/clock.png" alt="" className="w-6 h-6" />
          <span className="font-semibold">Pickup Time:</span>
          <span className="font-bold" style={{ color: pickupTimeColor }}>
            {formatPickupTime(order.pickupTime, order.createdAt)}
          </span>
        </div>

        {/* Phone Number - Emphasized for error orders */}
        <div className={`mb-3 flex items-center gap-2 text-sm ${isErrorOrder ? 'bg-yellow-100 p-3 rounded-lg border-2 border-yellow-400' : ''}`}>
          <img src="/icons/phone.png" alt="" className="w-6 h-6" />
          <span className={`font-semibold ${isErrorOrder ? 'text-red-700' : 'text-gray-700'}`}>
            {isErrorOrder ? '📞 CALL NOW:' : 'Phone:'}
          </span>
          <a
            href={`tel:${order.customerPhone}`}
            className={`font-bold ${isErrorOrder ? 'text-xl text-red-700 underline' : 'text-gray-700'}`}
          >
            {order.customerPhone}
          </a>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="mb-4 flex items-start gap-2 text-sm text-gray-700">
            <img src="/icons/notes.png" alt="" className="w-6 h-6 flex-shrink-0" />
            <div>
              <span className="font-semibold">Notes:</span>
              <p className="mt-1 text-gray-600 italic">{order.notes}</p>
            </div>
          </div>
        )}

        {/* Items Summary */}
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: isCompleted ? '#f9fafb' : '#F2E4D6' }}>
          <p className="text-xs font-semibold text-gray-600 mb-2">Order Items:</p>
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm text-gray-800">
              <span>{item.quantity}x {item.name}</span>
              <span className="font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mb-4 pt-3 border-t border-gray-200">
          <p className="text-xl font-bold text-center" style={{ color: isCompleted ? '#4C7A62' : '#FFB975' }}>
            ${order.totalAmount.toFixed(2)}
          </p>
        </div>

        {/* Action Buttons */}
        {isUndealt && (
          <div className="flex gap-2">
            {isErrorOrder ? (
              <>
                <a
                  href={`tel:${order.customerPhone}`}
                  className="cursor-pointer flex-1 px-4 py-3 rounded-lg transition-all duration-200 font-bold text-center"
                  style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B91C1C'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
                >
                  📞 Call Customer Now
                </a>
                <button
                  onClick={() => updateOrderStatus(order.id, 'cancelled')}
                  className="cursor-pointer px-4 py-3 rounded-lg transition-all duration-200 font-bold text-sm"
                  style={{ backgroundColor: '#6B7280', color: '#F2E4D6' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4B5563'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6B7280'}
                >
                  Dismiss
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => updateOrderStatus(order.id, 'preparing')}
                  className="cursor-pointer flex-1 px-4 py-2 rounded-lg transition-all duration-200 font-bold text-sm"
                  style={{ backgroundColor: '#4C7A62', color: '#F2E4D6' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d6350'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4C7A62'}
                >
                  Accept
                </button>
                <button
                  onClick={() => updateOrderStatus(order.id, 'cancelled')}
                  className="cursor-pointer flex-1 px-4 py-2 rounded-lg transition-all duration-200 font-bold text-sm"
                  style={{ backgroundColor: '#174D5A', color: '#F2E4D6' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#123b46'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#174D5A'}
                >
                  Decline
                </button>
              </>
            )}
          </div>
        )}

        {isPreparing && (
          <button
            onClick={() => updateOrderStatus(order.id, 'completed')}
            className="cursor-pointer w-full px-4 py-2 rounded-lg transition-all duration-200 font-bold"
            style={{ backgroundColor: '#FFB975', color: '#174D5A' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffa952'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFB975'}
          >
            Complete Order
          </button>
        )}
      </div>
    );
  };

  const currentTabConfig = getTabConfig(activeTab);
  const tabOrders = getTabOrders();

  return (
    <div className="min-h-screen">
      <Navigation />
      <AlertBanner undealtCount={undealtCount} onDismiss={dismissAlert} />

      {playbackError && (
        <div className="glass-card border-l-4 border-yellow-400 text-white p-4 mx-4 mt-4" role="alert">
          <p className="font-bold">Audio Alert Issue</p>
          <p>{playbackError}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="glass-card p-8 mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#F2E4D6' }}>
            Order Management
          </h1>
          <p style={{ color: '#F2E4D6', opacity: 0.9 }}>Track current orders and view order history</p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-card p-6 text-center">
            <div className="text-5xl font-bold mb-2" style={{ color: '#FFB975' }}>{orders.length}</div>
            <div style={{ color: '#F2E4D6', opacity: 0.8 }}>Total Orders</div>
          </div>
          <div className="glass-card p-6 text-center">
            <div className="text-5xl font-bold mb-2" style={{ color: '#FFB975' }}>{todayOrders}</div>
            <div style={{ color: '#F2E4D6', opacity: 0.8 }}>Today's Orders</div>
          </div>
          <div className="glass-card p-6 text-center">
            <div className="text-5xl font-bold mb-2" style={{ color: '#FFB975' }}>${totalRevenue.toFixed(2)}</div>
            <div style={{ color: '#F2E4D6', opacity: 0.8 }}>Total Revenue</div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="glass-card p-2 mb-6">
          <div className="flex flex-wrap gap-2">
            {(['undealt', 'preparing', 'completed'] as TabType[]).map((tab) => {
              const config = getTabConfig(tab);
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="cursor-pointer flex-1 px-3 py-2 md:px-6 md:py-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 md:gap-3 min-w-[120px]"
                  style={{
                    backgroundColor: isActive ? '#FFB975' : 'transparent',
                    color: isActive ? '#174D5A' : '#F2E4D6'
                  }}
                >
                  <img src={config.icon} alt="" className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="font-bold text-sm md:text-lg">{config.label}</span>
                  {config.count > 0 && (
                    <span
                      className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-bold ${isActive ? '' : 'animate-pulse'}`}
                      style={{
                        backgroundColor: isActive ? '#174D5A' : '#FFB975',
                        color: isActive ? '#F2E4D6' : '#174D5A'
                      }}
                    >
                      {config.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="glass-card p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by name, phone, or item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 transition-all"
              style={{
                borderColor: '#F2E4D6',
                backgroundColor: 'rgba(242, 228, 214, 0.2)',
                color: '#F2E4D6'
              }}
            />
          </div>

          {/* Orders Grid */}
          {tabOrders.length === 0 ? (
            <div className="glass-white p-12 text-center text-gray-500">
              {searchTerm ? 'No matching orders' : currentTabConfig.emptyMessage}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tabOrders.map(renderOrderCard)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
