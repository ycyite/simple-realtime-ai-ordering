'use client';
import { apiFetch } from '@/lib/api-client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { RestaurantSettings } from '@/types';

const defaultSettings: RestaurantSettings = {
  id: '1',
  name: '',
  phone: '',
  address: '',
};

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const [settings, setSettings] = useState<RestaurantSettings>(defaultSettings);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<RestaurantSettings>(settings);
  const [isOpen, setIsOpen] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Check if user has selected a restaurant, if not redirect to restaurants page
  useEffect(() => {
    const restaurantId = localStorage.getItem('activeRestaurantId');
    if (!restaurantId) {
      window.location.href = '/restaurants';
      return;
    }

    // Get user role from localStorage
    const role = localStorage.getItem('activeRestaurantRole');
    setUserRole(role);
  }, []);

  // Load restaurant data from settings API on mount
  useEffect(() => {
    apiFetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        const restaurantSettings: RestaurantSettings = {
          id: data.id || '1',
          name: data.name || '',
          phone: data.phone || '',
          address: data.address || '',
        };
        setSettings(restaurantSettings);
        setFormData(restaurantSettings);
      })
      .catch(err => console.error('Failed to load restaurant settings:', err));

    // Load restaurant status
    apiFetch('/api/restaurant-status')
      .then(res => res.json())
      .then(data => {
        setIsOpen(data.isOpen);
      })
      .catch(err => console.error('Failed to load restaurant status:', err));
  }, []);

  const handleStatusToggle = async () => {
    setIsUpdatingStatus(true);
    try {
      const newStatus = !isOpen;
      const response = await apiFetch('/api/restaurant-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: newStatus }),
      });

      if (response.ok) {
        setIsOpen(newStatus);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
        }),
      });

      if (response.ok) {
        setSettings(formData);
        setIsEditing(false);
      } else {
        console.error('Failed to update settings');
        alert('Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const handleCancel = () => {
    setFormData(settings);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Restaurant Status Toggle */}
        <div className="glass-white rounded-2xl shadow-2xl p-6 md:p-8 mb-6 border-2" style={{ borderColor: isOpen ? '#4C7A62' : '#dc2626' }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold" style={{ color: '#174D5A' }}>
                  Restaurant Status
                </h2>
                <p className={`text-lg font-semibold mt-1 ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
                  {isOpen ? '🟢 OPEN - Accepting Calls' : '🔴 CLOSED - Not Accepting Calls'}
                </p>
              </div>
            </div>

            <button
              onClick={handleStatusToggle}
              disabled={isUpdatingStatus}
              className={`relative inline-flex h-12 w-24 md:h-14 md:w-28 items-center rounded-full transition-all duration-300 shadow-lg hover:shadow-xl ${
                isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              style={{ backgroundColor: isOpen ? '#4C7A62' : '#dc2626' }}
            >
              <span
                className={`inline-block h-10 w-10 md:h-12 md:w-12 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                  isOpen ? 'translate-x-12 md:translate-x-14' : 'translate-x-1'
                }`}
              >
                {isUpdatingStatus && (
                  <svg className="animate-spin h-full w-full p-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </span>
            </button>
          </div>

          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(242, 228, 214, 0.3)' }}>
            <p className="text-sm" style={{ color: '#174D5A' }}>
              {isOpen
                ? '✓ Phone calls will be automatically answered by the AI assistant.'
                : '✗ Phone calls will NOT be answered. Callers will hear ringing until they hang up.'}
            </p>
          </div>
        </div>

        {/* Only show settings section for owners */}
        {userRole === 'owner' && (
          <>
        <div className="glass-card p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3" style={{ color: '#F2E4D6' }}>
              <img src="/icons/settings.png" alt="" className="w-10 h-10 md:w-12 md:h-12" />
              Restaurant Settings
            </h1>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl cursor-pointer w-full md:w-auto"
                style={{ backgroundColor: '#FFB975', color: '#174D5A' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffa952'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFB975'}
              >
                Edit Settings
              </button>
            )}
          </div>
          <p style={{ color: '#F2E4D6', opacity: 0.9 }}>Configure your restaurant information and AI assistant</p>
        </div>

        {isEditing ? (
          <div className="glass-white rounded-2xl shadow-2xl p-4 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#174D5A' }}>
                  Restaurant Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-800"
                  style={{ borderColor: '#174D5A' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#FFB975'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#174D5A'}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#174D5A' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-800"
                  style={{ borderColor: '#174D5A' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#FFB975'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#174D5A'}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#174D5A' }}>
                  Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-800"
                  style={{ borderColor: '#174D5A' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#FFB975'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#174D5A'}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t" style={{ borderColor: '#174D5A' }}>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 font-bold shadow-lg hover:shadow-xl cursor-pointer"
                  style={{ backgroundColor: '#FFB975', color: '#174D5A' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffa952'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFB975'}
                >
                  <img src="/icons/check-mark.png" alt="" className="w-6 h-6 inline mr-2" />
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-6 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 font-semibold cursor-pointer"
                  style={{ backgroundColor: '#F2E4D6', color: '#174D5A' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8d8c7'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F2E4D6'}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass-white rounded-2xl shadow-lg p-4 md:p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#174D5A' }}>
                <img src="/icons/menu.png" alt="" className="w-6 h-6" />
                Basic Information
              </h2>
              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-semibold mb-1" style={{ color: '#4C7A62' }}>Restaurant Name</dt>
                  <dd className="mt-1 text-lg font-medium text-gray-900">{settings.name || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold mb-1" style={{ color: '#4C7A62' }}>Phone Number</dt>
                  <dd className="mt-1 text-lg font-medium text-gray-900">{settings.phone || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold mb-1" style={{ color: '#4C7A62' }}>Address</dt>
                  <dd className="mt-1 text-lg font-medium text-gray-900">{settings.address || 'Not set'}</dd>
                </div>
              </dl>
            </div>

            <div className="glass-card p-4 md:p-6 border-l-4" style={{ borderLeftColor: '#FFB975' }}>
              <h2 className="text-xl font-bold mb-4" style={{ color: '#F2E4D6' }}>
                Integration Info
              </h2>
              <div className="space-y-2">
                <p className="text-sm" style={{ color: '#F2E4D6' }}>
                  <span className="font-semibold">Restaurant ID:</span> {settings.id}
                </p>
                <p className="text-sm" style={{ color: '#F2E4D6', opacity: 0.9 }}>
                  Use this ID when configuring the backend to link phone calls to this
                  restaurant's settings.
                </p>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
