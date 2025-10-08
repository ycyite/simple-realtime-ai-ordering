'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const success = await register(
        formData.email,
        formData.phone,
        formData.password,
        formData.name
      );

      if (success) {
        router.push('/orders');
      } else {
        setError('Registration failed. Please try again.');
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
          <Link
            href="/signin"
            className="flex-1 pb-3 text-center font-medium text-gray-500 hover:text-[#174D5A] transition-colors cursor-pointer"
          >
            Sign In
          </Link>
          <button className="flex-1 pb-3 text-center font-medium text-[#174D5A] border-b-2 border-[#174D5A] cursor-pointer">
            Register
          </button>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-gray-700 font-medium text-sm mb-2">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#174D5A] focus:border-transparent bg-white"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-gray-700 font-medium text-sm mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#174D5A] focus:border-transparent bg-white"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-gray-700 font-medium text-sm mb-2">
              Phone (optional)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#174D5A] focus:border-transparent bg-white"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-700 font-medium text-sm mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#174D5A] focus:border-transparent bg-white"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-gray-700 font-medium text-sm mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
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
            {isLoading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/signin" className="text-[#174D5A] font-medium hover:underline">
            Sign In
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
