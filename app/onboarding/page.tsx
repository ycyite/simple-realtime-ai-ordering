'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export default function OnboardingPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    restaurantName: '',
    phoneNumber: '',
    address: '',
  });

  useEffect(() => {
    // Check if user already has a tenant set up
    const checkTenant = async () => {
      try {
        const response = await fetch('/api/restaurant-status');
        if (response.ok) {
          // User already has a tenant, redirect to orders
          router.push('/orders');
        }
      } catch (err) {
        // User doesn't have tenant yet, stay on onboarding
      }
    };

    if (userId) {
      checkTenant();
    }
  }, [userId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      // Success - redirect to orders page
      router.push('/orders');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔔</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Counter Bell!</h1>
          <p className="text-gray-600">Let's set up your restaurant</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Restaurant Name *
            </label>
            <input
              type="text"
              required
              value={formData.restaurantName}
              onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Joe's Pizza"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={3}
              placeholder="123 Main Street, City, State 12345"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up...' : 'Complete Setup'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          You'll get $10 in free credits to get started! 🎉
        </p>
      </div>
    </div>
  );
}
