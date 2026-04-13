// src/app/api/security/login-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import LoginHistory from '@/models/LoginHistory';

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status'); // 'success' | 'failed' | null (all)

    const filter: any = { userId: session.user.id };
    if (status && ['success', 'failed'].includes(status)) {
      filter.status = status;
    }

    const total = await LoginHistory.countDocuments(filter);
    const history = await LoginHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Login history error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch login history' },
      { status: 500 }
    );
  }
}
