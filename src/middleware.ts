import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Hardcoded admin emails
const ADMIN_EMAILS = [
  'admin@horizonbank.com',
  'your-email@example.com',
];

// Hardcoded NextAuth secret
const NEXTAUTH_SECRET = 'b3bc4dcf9055e490cef86fd9647fc8acd61d6bbe07dfb85fb6848bfe7f4f3926';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  console.log('🔍 Middleware processing path:', path);

  try {
    // Get session token with hardcoded secret
    const session = await getToken({ 
      req, 
      secret: NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production',
    });

    console.log('📋 Session data:', {
      exists: !!session,
      email: session?.email || 'No email',
      role: session?.role || 'No role',
      name: session?.name || 'No name'
    });

    // Protect admin routes
    if (path.startsWith('/admin')) {
      console.log('🔐 Checking admin access...');
      
      if (!session || !session.email) {
        console.log('❌ No session or email found, redirecting to signin');
        return NextResponse.redirect(new URL('/auth/signin?error=no-session', req.url));
      }

      const userEmail = (session.email as string).toLowerCase().trim();
      const isAdminEmail = ADMIN_EMAILS.some(adminEmail =>
        adminEmail.toLowerCase().trim() === userEmail
      );
      const isAdminRole = session.role === 'admin' || session.role === 'superadmin';

      console.log('🔍 Admin check results:', {
        userEmail,
        isAdminEmail,
        isAdminRole,
        sessionRole: session.role
      });

      if (!isAdminEmail && !isAdminRole) {
        console.log('❌ Access denied - not admin');
        return NextResponse.redirect(new URL('/dashboard?error=access-denied', req.url));
      }

      console.log('✅ Admin access granted');
    }

    // Protect other authenticated routes
    const protectedPaths = [
      '/dashboard',
      '/transfers',
      '/accounts',
      '/cards',
      '/profile',
      '/settings',
      '/transactions',
      '/security',
    ];

    if (protectedPaths.some(p => path.startsWith(p))) {
      if (!session) {
        console.log('❌ No session for protected path, redirecting to signin');
        return NextResponse.redirect(new URL('/auth/signin?error=auth-required', req.url));
      }
      console.log('✅ Protected route access granted');
    }

    console.log('✅ Middleware completed successfully');
    return NextResponse.next();

  } catch (error) {
    console.error('❌ Middleware error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=middleware-error', req.url));
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/transfers/:path*',
    '/accounts/:path*',
    '/cards/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/transactions/:path*',
    '/security/:path*',
  ],
};