// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

interface IUser {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  accountNumber?: string;
  checkingBalance?: number;
  savingsBalance?: number;
  investmentBalance?: number;
  verified?: boolean;
  role?: string;
  accountStatus?: { kind: string; reference: string };
  createdAt?: Date;
  updatedAt?: Date;
}

// Escape user input before feeding it into a Mongo regex — otherwise a search
// for "a+" or "j." crashes the query or matches everything.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Reuse the existing User model — the previous version re-declared the
    // schema inline which silently shadowed the real one.
    const User = mongoose.models.User
      || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.trim() ?? '';
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));

    const filter: any = {};
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [
        { name: rx },
        { email: rx },
        { accountNumber: rx },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<IUser[]>();

    const formattedUsers = users.map((user) => ({
      _id: user._id.toString(),
      name: user.name || 'Unknown User',
      email: user.email || 'no-email@example.com',
      accountNumber: user.accountNumber ?? null,
      checkingBalance: Number(user.checkingBalance) || 0,
      savingsBalance: Number(user.savingsBalance) || 0,
      investmentBalance: Number(user.investmentBalance) || 0,
      verified: Boolean(user.verified),
      role: user.role || 'user',
      accountStatus: user.accountStatus ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (error: any) {
    console.error('Error in users API route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch users', users: [], total: 0 },
      { status: 500 },
    );
  }
}
