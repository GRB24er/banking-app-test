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

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: Record<string, any> = { userId: user._id };
    if (type && ['conversion', 'send', 'receive'].includes(type)) {
      query.type = type;
    }

    const transactions = await CryptoTransaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({
      success: true,
      transactions: transactions.map(t => ({
        id: t._id.toString(),
        type: t.type,
        status: t.status,
        reference: t.reference,
        description: t.description,
        
        // Conversion fields
        fromCurrency: t.fromCurrency,
        toCurrency: t.toCurrency,
        fromAmount: t.fromAmount,
        toAmount: t.toAmount,
        exchangeRate: t.exchangeRate,
        
        // Send fields
        cryptoCurrency: t.cryptoCurrency,
        cryptoAmount: t.cryptoAmount,
        walletAddress: t.walletAddress,
        network: t.network,
        txHash: t.txHash,
        
        fee: t.fee,
        usdValue: t.metadata?.usdValue,
        date: t.createdAt,
      }))
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
