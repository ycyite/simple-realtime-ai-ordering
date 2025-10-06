'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { RestaurantSettings } from '@/types';

const defaultSettings: RestaurantSettings = {
  id: '1',
  name: '',
  phone: '',
  address: '',
  aiPrompt: '',
  welcomeMessage: '',
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

  // Load restaurant data from menu API on mount
  useEffect(() => {
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        const restaurantSettings: RestaurantSettings = {
          id: '1',
          name: data.restaurant?.name || '',
          phone: data.restaurant?.phone || '',
          address: data.restaurant?.location || '',
          aiPrompt: '',
          welcomeMessage: '',
        };
        setSettings(restaurantSettings);
        setFormData(restaurantSettings);
      })
      .catch(err => console.error('Failed to load restaurant settings:', err));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(settings);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
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

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#174D5A' }}>
                  Welcome Message
                </label>
                <textarea
                  required
                  value={formData.welcomeMessage}
                  onChange={(e) =>
                    setFormData({ ...formData, welcomeMessage: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 resize-none text-gray-800"
                  style={{ borderColor: '#174D5A' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#FFB975'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#174D5A'}
                  placeholder="What the AI says when answering the phone..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#174D5A' }}>
                  AI Prompt / Instructions
                </label>
                <textarea
                  required
                  value={formData.aiPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, aiPrompt: e.target.value })
                  }
                  rows={8}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 resize-none text-gray-800"
                  style={{ borderColor: '#174D5A' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#FFB975'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#174D5A'}
                  placeholder="Instructions for how the AI should behave during calls..."
                />
                <p className="text-sm mt-2" style={{ color: '#4C7A62' }}>
                  This prompt guides the AI's behavior during phone calls. Be specific about
                  tone, order confirmation process, and how to handle special requests.
                </p>
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

            <div className="glass-white rounded-2xl shadow-lg p-4 md:p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#174D5A' }}>
                <img src="/icons/bell-dark.png" alt="" className="w-6 h-6" />
                AI Configuration
              </h2>
              <div className="space-y-4">
                <div>
                  <dt className="text-sm font-semibold mb-2" style={{ color: '#4C7A62' }}>Welcome Message</dt>
                  <dd className="mt-1 text-gray-900 p-4 rounded-lg" style={{ backgroundColor: 'rgba(242, 228, 214, 0.5)' }}>
                    {settings.welcomeMessage || 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold mb-2" style={{ color: '#4C7A62' }}>AI Prompt</dt>
                  <dd className="mt-1 text-gray-900 p-4 rounded-lg whitespace-pre-wrap" style={{ backgroundColor: 'rgba(242, 228, 214, 0.5)' }}>
                    {settings.aiPrompt || 'Not set'}
                  </dd>
                </div>
              </div>
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
      </div>
    </div>
  );
}
