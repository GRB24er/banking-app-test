import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getCryptoPrices, NETWORK_OPTIONS } from '@/lib/cryptoPrices';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const prices = await getCryptoPrices();

    return NextResponse.json({
      success: true,
      prices,
      networks: NETWORK_OPTIONS,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[Crypto Prices] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch prices' }, { status: 500 });
  }
}
