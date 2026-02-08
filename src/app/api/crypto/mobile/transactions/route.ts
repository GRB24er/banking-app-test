import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import CryptoTransaction from '@/models/CryptoTransaction';

const AUTH_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || '308d98ab1034136b95e1f7b43f6afde185e5892d09bbe9d1e2b68e1db9c1acae';

async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, AUTH_SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await verifyToken(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    await connectDB();

    const query: Record<string, any> = { userId: decoded.userId };
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
