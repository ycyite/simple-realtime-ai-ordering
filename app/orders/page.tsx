'use client';

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

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);

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
    fetch('/api/orders')
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
          notes: order.notes || '',
        }));
        setOrders(formattedOrders);
      })
      .catch(err => console.error('Failed to load orders:', err));
  }, []);

  const [filter, setFilter] = useState<'all' | 'undealt' | 'preparing' | 'completed'>('all');
  const [undealtSearch, setUndealtSearch] = useState('');
  const [preparingSearch, setPreparingSearch] = useState('');
  const [completedSearch, setCompletedSearch] = useState('');
  const { isAlertActive, dismissAlert, playbackError } = useOrderAlert(orders);

  // Poll for new orders every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/orders')
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
            notes: order.notes || '',
          }));
          setOrders(formattedOrders);
        })
        .catch(err => console.error('Failed to refresh orders:', err));
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const undealtCount = orders.filter((o) => o.status === 'undealt').length;

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    // Update local state
    const updatedOrders = orders.map((order) =>
      order.id === orderId ? { ...order, status } : order
    );
    setOrders(updatedOrders);

    // Save to backend
    fetch('/api/orders/update', {
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

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'undealt':
        return 'bg-red-100 text-red-800';
      case 'preparing':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const todayOrders = orders.filter(o => {
    const today = new Date().toDateString();
    const orderDate = new Date(o.createdAt).toDateString();
    return today === orderDate;
  }).length;

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
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3" style={{ color: '#F2E4D6' }}>
            <img src="/icons/list.png" alt="" className="w-12 h-12" />
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

        {/* Kanban Board - Three Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Undealt Orders */}
          <div className="glass-card p-4">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#F2E4D6' }}>
                  <img src="/icons/undealt.png" alt="" className="w-7 h-7" />
                  New Orders
                  {orders.filter(o => o.status === 'undealt').length > 0 && (
                    <span className="px-3 py-1 rounded-full text-sm animate-pulse" style={{ backgroundColor: '#FFB975', color: '#174D5A' }}>
                      {orders.filter(o => o.status === 'undealt').length}
                    </span>
                  )}
                </h2>
              </div>
              <input
                type="text"
                placeholder="Search by name, phone, or item..."
                value={undealtSearch}
                onChange={(e) => setUndealtSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: '#F2E4D6',
                  backgroundColor: 'rgba(242, 228, 214, 0.2)',
                  color: '#F2E4D6'
                }}
              />
            </div>
            <div className="space-y-3">
              {filterOrders(orders.filter(o => o.status === 'undealt'), undealtSearch).length === 0 ? (
                <div className="glass-white p-6 text-center text-gray-500">
                  {undealtSearch ? 'No matching orders' : 'No pending orders'}
                </div>
              ) : (
                filterOrders(orders.filter(o => o.status === 'undealt'), undealtSearch).map((order) => (
                  <div key={order.id} className="glass-white p-4 hover:shadow-xl transition-all duration-300 border-l-4 rounded-xl" style={{ borderLeftColor: '#FFB975' }}>
                    {/* Customer Name */}
                    <div className="mb-3">
                      <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <img src="/icons/user.png" alt="" className="w-6 h-6" />
                        {order.customerName || `Customer ${order.customerPhone.slice(-4)}`}
                      </p>
                    </div>

                    {/* Pickup Time */}
                    <div className="mb-3 flex items-center gap-2 text-sm text-gray-700">
                      <img src="/icons/clock.png" alt="" className="w-6 h-6" />
                      <span className="font-semibold">Pickup Time:</span>
                      <span className="font-bold" style={{ color: '#FFB975' }}>
                        {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Phone Number */}
                    <div className="mb-4 flex items-center gap-2 text-sm text-gray-700">
                      <img src="/icons/phone.png" alt="" className="w-6 h-6" />
                      <span className="font-semibold">Phone:</span>
                      <span>{order.customerPhone}</span>
                    </div>

                    {/* Items Summary */}
                    <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#F2E4D6' }}>
                      <p className="text-xs font-semibold text-gray-600 mb-2">Order Items:</p>
                      {order.items.map((item, idx) => (
                        <p key={idx} className="text-sm text-gray-800">
                          {item.quantity}x {item.name}
                        </p>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="mb-4 pt-3 border-t border-gray-200">
                      <p className="text-xl font-bold text-center" style={{ color: '#FFB975' }}>
                        ${order.totalAmount.toFixed(2)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className="flex-1 px-4 py-2 rounded-lg transition-all duration-200 font-bold text-sm"
                        style={{ backgroundColor: '#4C7A62', color: '#F2E4D6' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d6350'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4C7A62'}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        className="flex-1 px-4 py-2 rounded-lg transition-all duration-200 font-bold text-sm"
                        style={{ backgroundColor: '#174D5A', color: '#F2E4D6' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#123b46'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#174D5A'}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Current Orders (Preparing) */}
          <div className="glass-card p-4">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#F2E4D6' }}>
                  <img src="/icons/dealing.png" alt="" className="w-7 h-7" />
                  In Progress
                  {orders.filter(o => o.status === 'preparing').length > 0 && (
                    <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: '#FFB975', color: '#174D5A' }}>
                      {orders.filter(o => o.status === 'preparing').length}
                    </span>
                  )}
                </h2>
              </div>
              <input
                type="text"
                placeholder="Search by name, phone, or item..."
                value={preparingSearch}
                onChange={(e) => setPreparingSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: '#F2E4D6',
                  backgroundColor: 'rgba(242, 228, 214, 0.2)',
                  color: '#F2E4D6'
                }}
              />
            </div>
            <div className="space-y-3">
              {filterOrders(orders.filter(o => o.status === 'preparing'), preparingSearch).length === 0 ? (
                <div className="glass-white p-6 text-center text-gray-500">
                  {preparingSearch ? 'No matching orders' : 'No orders in progress'}
                </div>
              ) : (
                filterOrders(orders.filter(o => o.status === 'preparing'), preparingSearch).map((order) => (
                  <div key={order.id} className="glass-white p-4 hover:shadow-xl transition-all duration-300 border-l-4 rounded-xl" style={{ borderLeftColor: '#4C7A62' }}>
                    <div className="mb-3">
                      <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <img src="/icons/user.png" alt="" className="w-6 h-6" />
                        {order.customerName || `Customer ${order.customerPhone.slice(-4)}`}
                      </p>
                    </div>

                    <div className="mb-3 flex items-center gap-2 text-sm text-gray-700">
                      <img src="/icons/clock.png" alt="" className="w-6 h-6" />
                      <span className="font-semibold">Pickup Time:</span>
                      <span className="font-bold" style={{ color: '#FFB975' }}>
                        {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="mb-4 flex items-center gap-2 text-sm text-gray-700">
                      <img src="/icons/phone.png" alt="" className="w-6 h-6" />
                      <span className="font-semibold">Phone:</span>
                      <span>{order.customerPhone}</span>
                    </div>

                    <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#F2E4D6' }}>
                      <p className="text-xs font-semibold text-gray-600 mb-2">Order Items:</p>
                      {order.items.map((item, idx) => (
                        <p key={idx} className="text-sm text-gray-800">
                          {item.quantity}x {item.name}
                        </p>
                      ))}
                    </div>

                    <div className="mb-4 pt-3 border-t border-gray-200">
                      <p className="text-xl font-bold text-center" style={{ color: '#FFB975' }}>
                        ${order.totalAmount.toFixed(2)}
                      </p>
                    </div>

                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="w-full px-4 py-2 rounded-lg transition-all duration-200 font-bold"
                      style={{ backgroundColor: '#FFB975', color: '#174D5A' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffa952'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFB975'}
                    >
                      Complete Order
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 3: Order History (Completed) */}
          <div className="glass-card p-4">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#F2E4D6' }}>
                  <img src="/icons/check-mark.png" alt="" className="w-7 h-7" />
                  Completed
                  {orders.filter(o => o.status === 'completed').length > 0 && (
                    <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: '#4C7A62', color: '#F2E4D6' }}>
                      {orders.filter(o => o.status === 'completed').length}
                    </span>
                  )}
                </h2>
              </div>
              <input
                type="text"
                placeholder="Search by name, phone, or item..."
                value={completedSearch}
                onChange={(e) => setCompletedSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: '#F2E4D6',
                  backgroundColor: 'rgba(242, 228, 214, 0.2)',
                  color: '#F2E4D6'
                }}
              />
            </div>
            <div className="space-y-3">
              {filterOrders(orders.filter(o => o.status === 'completed'), completedSearch).length === 0 ? (
                <div className="glass-white p-6 text-center text-gray-500">
                  {completedSearch ? 'No matching orders' : 'No completed orders'}
                </div>
              ) : (
                filterOrders(orders.filter(o => o.status === 'completed'), completedSearch).map((order) => (
                  <div key={order.id} className="glass-white p-4 hover:shadow-xl transition-all duration-300 border-l-4 rounded-xl opacity-80" style={{ borderLeftColor: '#4C7A62' }}>
                    <div className="mb-3">
                      <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <img src="/icons/user.png" alt="" className="w-6 h-6" />
                        {order.customerName || `Customer ${order.customerPhone.slice(-4)}`}
                      </p>
                    </div>

                    <div className="mb-3 flex items-center gap-2 text-sm text-gray-700">
                      <img src="/icons/clock.png" alt="" className="w-6 h-6" />
                      <span className="font-semibold">Pickup Time:</span>
                      <span className="font-bold" style={{ color: '#4C7A62' }}>
                        {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="mb-4 flex items-center gap-2 text-sm text-gray-700">
                      <img src="/icons/phone.png" alt="" className="w-6 h-6" />
                      <span className="font-semibold">Phone:</span>
                      <span>{order.customerPhone}</span>
                    </div>

                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Order Items:</p>
                      {order.items.map((item, idx) => (
                        <p key={idx} className="text-sm text-gray-800">
                          {item.quantity}x {item.name}
                        </p>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xl font-bold text-center" style={{ color: '#4C7A62' }}>
                        ${order.totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
