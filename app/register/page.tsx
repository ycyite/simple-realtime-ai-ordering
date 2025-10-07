'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
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

        {/* Clerk Sign Up Component with custom styling */}
        <div className="clerk-wrapper">
          <SignUp
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'glass-white shadow-none',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton: 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                formButtonPrimary: 'bg-[#174D5A] hover:bg-[#0f3640]',
                formFieldInput: 'border-gray-300 focus:ring-[#174D5A] focus:border-[#174D5A]',
                footerActionLink: 'text-[#174D5A] hover:text-[#0f3640]',
              },
            }}
            routing="path"
            path="/register"
            signInUrl="/signin"
            afterSignUpUrl="/orders"
          />
        </div>

        {/* Footer */}
        <p className="mt-4 text-center text-xs text-gray-500">
          <Link href="#" className="hover:underline cursor-pointer">
            Contact Us / Support
          </Link>
        </p>
      </div>
    </div>
  );
}
