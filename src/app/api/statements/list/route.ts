// src/app/api/statements/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Statement from '@/models/Statement';
import User from '@/models/User';

const authOptions = {
  secret: 'b3bc4dcf9055e490cef86fd9647fc8acd61d6bbe07dfb85fb6848bfe7f4f3926',
};

const ADMIN_EMAILS = ['admin@zentribank.capital', 'your-email@example.com'];

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const isAdmin = user.role === 'admin' || ADMIN_EMAILS.includes(session.user.email.toLowerCase());

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const statements = await Statement.find(query)
      .populate('userId', 'name email')
      .sort({ requestedAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      data: statements
    });

  } catch (error: any) {
    console.error('❌ Statement list error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch statements' },
      { status: 500 }
    );
  }
}