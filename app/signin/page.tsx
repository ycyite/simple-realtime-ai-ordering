'use client';

import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #2d6a5f 0%, #4a8b7f 100%)' }}>
      <div className="glass-white w-full max-w-md p-8 rounded-2xl">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-2">
            <img src="/icons/bell-dark.png" alt="" className="w-12 h-12" />
            <h1 className="text-3xl font-bold text-[#174D5A]" style={{ fontFamily: 'var(--font-kranky)' }}>Counter Bell</h1>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mt-4 italic" style={{ fontFamily: 'var(--font-dm-serif-text)' }}>Welcome!</h2>
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

        {/* Clerk Sign In Component with custom styling */}
        <div className="clerk-wrapper">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-transparent shadow-none p-0',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton: 'hidden',
                dividerRow: 'hidden',
                formFieldLabel: 'text-gray-700 font-medium text-sm',
                formFieldInput: 'w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#174D5A] focus:border-transparent bg-white',
                formButtonPrimary: 'w-full bg-[#174D5A] text-white py-3 rounded-lg font-medium hover:bg-[#0f3640] transition-colors',
                footerAction: 'text-center mt-6',
                footerActionText: 'text-sm text-gray-600',
                footerActionLink: 'text-[#174D5A] font-medium hover:underline',
                identityPreviewText: 'text-gray-700',
                formResendCodeLink: 'text-[#174D5A] hover:text-[#0f3640]',
              },
            }}
            routing="path"
            path="/signin"
            signUpUrl="/register"
            afterSignInUrl="/restaurants"
            forceRedirectUrl="/restaurants"
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
