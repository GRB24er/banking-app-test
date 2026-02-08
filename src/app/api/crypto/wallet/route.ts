import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import CryptoWallet from '@/models/CryptoWallet';
import { getCryptoPrices } from '@/lib/cryptoPrices';

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

    // Get or create wallet
    let wallet = await CryptoWallet.findOne({ userId: user._id });
    if (!wallet) {
      wallet = await CryptoWallet.create({ userId: user._id });
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
