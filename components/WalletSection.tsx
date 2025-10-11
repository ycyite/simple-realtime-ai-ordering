'use client';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';

export default function WalletSection() {
  const [walletBalance, setWalletBalance] = useState(0);
  const [isRecharging, setIsRecharging] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Get user role
    const role = localStorage.getItem('activeRestaurantRole');
    setUserRole(role);

    // Load wallet balance
    apiFetch('/api/wallet/balance')
      .then(res => res.json())
      .then(data => {
        setWalletBalance(data.walletBalance || 0);
      })
      .catch(err => console.error('Failed to load wallet balance:', err));
  }, []);

  const handleRecharge = async (amount: number) => {
    setIsRecharging(true);
    try {
      const res = await apiFetch('/api/wallet/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      } else {
        alert('Failed to create payment session');
      }
    } catch (error) {
      console.error('Recharge failed:', error);
      alert('Failed to initiate recharge');
    } finally {
      setIsRecharging(false);
    }
  };

  // Only show wallet section to owners
  if (userRole !== 'owner') {
    return null;
  }

  const isLowBalance = walletBalance < 10;

  return (
    <div className="glass-white rounded-2xl shadow-2xl p-6 md:p-8 mb-6 border-2" style={{ borderColor: isLowBalance ? '#dc2626' : '#FFB975' }}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex-1">
          <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: '#174D5A' }}>
            💰 Wallet Balance
          </h2>
          <div className="text-4xl md:text-5xl font-bold mb-3" style={{ color: '#FFB975' }}>
            ${walletBalance.toFixed(2)}
          </div>

          {/* Low Balance Warning */}
          {isLowBalance && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-3 rounded">
              <p className="text-red-700 font-semibold text-sm">
                ⚠️ Low Balance! Add funds to continue receiving AI phone calls.
              </p>
            </div>
          )}

          <p className="text-sm text-gray-600">
            Your wallet is charged automatically when customers call. Top up anytime to keep your service running.
          </p>
        </div>

        {/* Recharge Buttons */}
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <button
            onClick={() => handleRecharge(25)}
            disabled={isRecharging}
            className="px-6 py-3 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#4C7A62', color: '#F2E4D6' }}
          >
            Add $25
          </button>
          <button
            onClick={() => handleRecharge(50)}
            disabled={isRecharging}
            className="px-6 py-3 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#4C7A62', color: '#F2E4D6' }}
          >
            Add $50
          </button>
          <button
            onClick={() => handleRecharge(100)}
            disabled={isRecharging}
            className="px-6 py-3 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#FFB975', color: '#174D5A' }}
          >
            Add $100
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-2">How Billing Works:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• AI call costs are deducted automatically after each call</li>
          <li>• OpenAI API: Actual cost + 50% markup (typically $0.05-0.20 per call)</li>
          <li>• Twilio voice: Pass-through cost ($0.013/min, no markup)</li>
          <li>• You'll be notified when balance drops below $10</li>
        </ul>
      </div>
    </div>
  );
}
