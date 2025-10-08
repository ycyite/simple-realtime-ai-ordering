'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function SignInPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/orders');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        router.push('/orders');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #2d6a5f 0%, #4a8b7f 100%)' }}>
      <div className="glass-white w-full max-w-md p-8 rounded-2xl">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-2">
            <img src="/icons/bell-dark.png" alt="" className="w-12 h-12" />
            <h1 className="text-3xl font-bold text-[#174D5A]">Counter Bell</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mt-4">Welcome!</h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-300 mb-6">
          <button className="flex-1 pb-3 text-center font-medium text-[#174D5A] border-b-2 border-[#174D5A] cursor-pointer">
            Sign In
          </button>
          <Link
            href="/register"
            className="flex-1 pb-3 text-center font-medium text-gray-500 hover:text-[#174D5A] transition-colors cursor-pointer"
          >
            Register
          </Link>
        </div>

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-gray-700 font-medium text-sm mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#174D5A] focus:border-transparent bg-white"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-700 font-medium text-sm mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#174D5A] focus:border-transparent bg-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#174D5A] text-white py-3 rounded-lg font-medium hover:bg-[#0f3640] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#174D5A] font-medium hover:underline">
            Register
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-gray-500">
          <Link href="#" className="hover:underline cursor-pointer">
            Contact Us / Support
          </Link>
        </p>
      </div>
    </div>
  );
}
