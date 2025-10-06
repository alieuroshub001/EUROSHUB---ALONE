import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected routes that require authentication
const protectedRoutes = ['/superadmin', '/admin', '/hr', '/employee', '/client'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const pathname = request.nextUrl.pathname;

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  // If it's a protected route and no token exists, redirect to login
  if (isProtectedRoute && !token) {
    const url = new URL('/', request.url);
    // Add a query parameter to indicate session expired
    url.searchParams.set('session', 'expired');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
