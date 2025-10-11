'use client';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function BillingPage() {
  return (
    <ProtectedRoute>
      <BillingContent />
    </ProtectedRoute>
  );
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  balance_after: number;
  openai_cost?: number;
  openai_charged?: number;
  twilio_cost?: number;
  platform_markup?: number;
}

function BillingContent() {
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isRecharging, setIsRecharging] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has selected a restaurant
  useEffect(() => {
    const restaurantId = localStorage.getItem('activeRestaurantId');
    if (!restaurantId) {
      window.location.href = '/restaurants';
      return;
    }

    // Check if owner
    const role = localStorage.getItem('activeRestaurantRole');
    if (role !== 'owner') {
      window.location.href = '/orders'; // Redirect non-owners
      return;
    }
  }, []);

  // Load wallet data
  useEffect(() => {
    Promise.all([
      apiFetch('/api/wallet/balance').then(res => res.json()),
      apiFetch('/api/wallet/transactions').then(res => res.json())
    ])
      .then(([balanceData, transactionsData]) => {
        setWalletBalance(balanceData.walletBalance || 0);
        setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load wallet data:', err);
        setLoading(false);
      });
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

  const isLowBalance = walletBalance < 10;

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'recharge':
        return '💳';
      case 'ai_call_cost':
        return '📞';
      case 'twilio_call_cost':
        return '☎️';
      case 'subscription_fee':
        return '📅';
      default:
        return '💰';
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'recharge':
        return 'Wallet Recharge';
      case 'ai_call_cost':
        return 'AI Call Cost';
      case 'twilio_call_cost':
        return 'Twilio Call Cost';
      case 'subscription_fee':
        return 'Monthly Subscription';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-white">Loading billing information...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="glass-card p-8 mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3" style={{ color: '#F2E4D6' }}>
            💰 Billing & Wallet
          </h1>
          <p style={{ color: '#F2E4D6', opacity: 0.9 }}>Manage your wallet and view transaction history</p>
        </div>

        {/* Wallet Balance Card */}
        <div className="glass-card p-6 md:p-8 mb-8 border-l-4" style={{ borderColor: isLowBalance ? '#dc2626' : '#FFB975' }}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: '#F2E4D6' }}>
                Current Balance
              </h2>
              <div className="text-5xl md:text-6xl font-bold mb-3" style={{ color: '#FFB975' }}>
                ${walletBalance.toFixed(2)}
              </div>

              {/* Low Balance Warning */}
              {isLowBalance && (
                <div className="bg-red-100 border-l-4 border-red-500 p-3 mb-3 rounded">
                  <p className="text-red-700 font-semibold text-sm">
                    ⚠️ Low Balance! Add funds to continue receiving AI phone calls.
                  </p>
                </div>
              )}

              <p className="text-sm" style={{ color: '#F2E4D6', opacity: 0.8 }}>
                Charges are deducted automatically after each call
              </p>
            </div>

            {/* Recharge Buttons */}
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <button
                onClick={() => handleRecharge(25)}
                disabled={isRecharging}
                className="px-8 py-3 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#4C7A62', color: '#F2E4D6' }}
              >
                Add $25
              </button>
              <button
                onClick={() => handleRecharge(50)}
                disabled={isRecharging}
                className="px-8 py-3 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#4C7A62', color: '#F2E4D6' }}
              >
                Add $50
              </button>
              <button
                onClick={() => handleRecharge(100)}
                disabled={isRecharging}
                className="px-8 py-3 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#FFB975', color: '#174D5A' }}
              >
                Add $100
              </button>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgba(242, 228, 214, 0.3)' }}>
            <h3 className="font-semibold mb-3" style={{ color: '#F2E4D6' }}>How Billing Works:</h3>
            <ul className="text-sm space-y-2" style={{ color: '#F2E4D6', opacity: 0.9 }}>
              <li>• <strong>AI Processing:</strong> OpenAI cost + 50% markup (typically $0.05-0.20 per call)</li>
              <li>• <strong>Phone Service:</strong> Twilio voice at $0.013/min (pass-through, no markup)</li>
              <li>• <strong>Automatic Billing:</strong> Costs deducted immediately after each call ends</li>
              <li>• <strong>Low Balance Alert:</strong> Notification when balance drops below $10</li>
            </ul>
          </div>
        </div>

        {/* Transaction History */}
        <div className="glass-card p-6 md:p-8">
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#F2E4D6' }}>
            Transaction History
          </h2>

          {transactions.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#F2E4D6', opacity: 0.6 }}>
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="glass-white p-4 rounded-lg hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{getTransactionIcon(tx.type)}</span>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {getTransactionLabel(tx.type)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(tx.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {tx.description && (
                        <p className="text-sm text-gray-600 ml-10">{tx.description}</p>
                      )}

                      {/* Cost Breakdown for AI calls */}
                      {tx.type === 'ai_call_cost' && tx.openai_cost && (
                        <div className="mt-2 ml-10 text-xs text-gray-500 space-y-1">
                          <div>OpenAI: ${Number(tx.openai_cost).toFixed(6)} → Charged: ${Number(tx.openai_charged || 0).toFixed(6)}</div>
                          <div>Platform markup: ${Number(tx.platform_markup || 0).toFixed(6)}</div>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <p
                        className="text-2xl font-bold"
                        style={{ color: tx.amount > 0 ? '#4C7A62' : '#dc2626' }}
                      >
                        {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Balance: ${tx.balance_after.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
