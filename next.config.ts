import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/signin',
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/register',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/orders',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/orders',
  },
  serverExternalPackages: ['@prisma/client', 'prisma'],
};

export default nextConfig;
