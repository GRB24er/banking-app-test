import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import CryptoWallet from '@/models/CryptoWallet';
import { getCryptoPrices } from '@/lib/cryptoPrices';

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

    await connectDB();

    // Get or create wallet
    let wallet = await CryptoWallet.findOne({ userId: decoded.userId });
    if (!wallet) {
      wallet = await CryptoWallet.create({ userId: decoded.userId });
    }

    // Get current prices
    const prices = await getCryptoPrices();
    const priceMap = Object.fromEntries(prices.map(p => [p.symbol, p]));

    // Calculate USD values
    const balancesWithValue = wallet.balances.map((b: any) => {
      const priceInfo = priceMap[b.symbol];
      const usdValue = priceInfo ? b.balance * priceInfo.price : 0;
      const lockedUsdValue = priceInfo ? b.lockedBalance * priceInfo.price : 0;
      
      return {
        currency: b.currency,
        symbol: b.symbol,
        balance: b.balance,
        lockedBalance: b.lockedBalance,
        availableBalance: b.balance - b.lockedBalance,
        usdValue,
        lockedUsdValue,
        price: priceInfo?.price || 0,
        change24h: priceInfo?.change24h || 0,
      };
    });

    const totalUsdValue = balancesWithValue.reduce((sum: number, b: any) => sum + b.usdValue, 0);

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet._id.toString(),
        balances: balancesWithValue,
        totalUsdValue,
      },
    });

  } catch (error: any) {
    console.error('[Crypto Wallet] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch wallet' }, { status: 500 });
  }
}
