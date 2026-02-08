import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import CryptoTransaction from '@/models/CryptoTransaction';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const pendingTransactions = await CryptoTransaction.find({
      status: 'pending_approval'
    }).sort({ createdAt: -1 }).populate('userId', 'name email');

    return NextResponse.json({
      success: true,
      transactions: pendingTransactions.map(t => ({
        id: t._id.toString(),
        user: {
          name: (t.userId as any)?.name,
          email: (t.userId as any)?.email,
        },
        type: t.type,
        cryptoCurrency: t.cryptoCurrency,
        amount: t.cryptoAmount,
        usdValue: t.metadata?.usdValue,
        walletAddress: t.walletAddress,
        network: t.network,
        fee: t.fee,
        reference: t.reference,
        date: t.createdAt,
      }))
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch pending transactions' }, { status: 500 });
  }
}
