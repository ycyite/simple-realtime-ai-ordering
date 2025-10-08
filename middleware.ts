import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes
  const protectedPaths = ['/orders', '/menu', '/settings'];
  const isProtectedRoute = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  // Protected API routes
  const protectedApiPaths = ['/api/orders', '/api/menu'];
  const isProtectedApiRoute = protectedApiPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  // Redirect to signin if accessing protected route without session
  if ((isProtectedRoute || isProtectedApiRoute) && !session) {
    if (isProtectedApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const redirectUrl = new URL('/signin', req.url);
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to orders if accessing auth pages while logged in
  if (session && (req.nextUrl.pathname === '/signin' || req.nextUrl.pathname === '/register')) {
    return NextResponse.redirect(new URL('/orders', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
