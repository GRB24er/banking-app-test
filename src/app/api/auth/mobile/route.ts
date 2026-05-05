// src/app/api/auth/mobile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Use env var in production; fall back to hardcoded secret for compatibility
const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  'b3bc4dcf9055e490cef86fd9647fc8acd61d6bbe07dfb85fb6848bfe7f4f3926';

// CORS headers — allow mobile app (no Origin header) and web clients
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client',
};

// Handle preflight OPTIONS request from mobile app
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  console.log('[Mobile Auth] POST - Login attempt');
  try {
    await dbConnect();
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      console.log('[Mobile Auth] User not found:', email);
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const isValid = await bcrypt.compare(password.trim(), user.password);
    if (!isValid) {
      console.log('[Mobile Auth] Invalid password for:', email);
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role || 'user' },
      AUTH_SECRET,
      { expiresIn: '30d' }
    );

    const nameParts = (user.name || '').split(' ');
    console.log('[Mobile Auth] Login successful:', email);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          name: user.name,
          accountNumber: user.accountNumber,
          routingNumber: user.routingNumber,
          balance: user.checkingBalance || 0,
          checkingBalance: user.checkingBalance || 0,
          savingsBalance: user.savingsBalance || 0,
          investmentBalance: user.investmentBalance || 0,
          verified: user.verified,
          role: user.role || 'user',
        },
        token,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[Mobile Auth] POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('[Mobile Auth] GET - Verify token');
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded: { userId: string; email: string };
    try {
      decoded = jwt.verify(token, AUTH_SECRET) as { userId: string; email: string };
    } catch (err) {
      console.log('[Mobile Auth] Token invalid or expired');
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token. Please sign in again.' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    await dbConnect();
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const nameParts = (user.name || '').split(' ');
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          name: user.name,
          accountNumber: user.accountNumber,
          routingNumber: user.routingNumber,
          balance: user.checkingBalance || 0,
          checkingBalance: user.checkingBalance || 0,
          savingsBalance: user.savingsBalance || 0,
          investmentBalance: user.investmentBalance || 0,
          verified: user.verified,
          role: user.role || 'user',
        },
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[Mobile Auth] GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
